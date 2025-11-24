// src/sockets.js
import db from './db.js';

/**
 * Socket events:
 * - join_room: { quizId, wallet, name }
 * - leave_room: { quizId }
 * - host_start: { quizId }  // host tells server to start quiz (server emits question flow)
 * - submit_answer: { quizId, participantId, questionIndex, selectedOption }
 * - host_emit_question: { quizId, questionIndex, questionObj } // optionally host-driven
 *
 * Server emits:
 * - player_joined, player_left, question, answer_accepted, quiz_started, quiz_ended
 */

export default function (io) {
  io.on('connection', (socket) => {
    console.log('socket connected:', socket.id);

    socket.on('join_quiz', async (payload) => {
      const { quizId, wallet, name, isHost } = payload;
      
      console.log(`👤 ${isHost ? 'HOST' : 'PLAYER'} joining quiz ${quizId}:`, wallet);
      
      try {
        const room = `quiz_${quizId}`;
        
        // Join the room
        socket.join(room);
        
        // Store quiz info in socket data
        socket.data.quizId = quizId;
        socket.data.wallet = wallet;
        socket.data.isHost = isHost;
        
        if (!isHost) {
          // For players, create or get participant record
          let participant;
          
          // Check if already exists
          const existing = await db.query(
            'SELECT * FROM participants WHERE quiz_id = $1 AND wallet = $2',
            [quizId, wallet]
          );
          
          if (existing.rowCount > 0) {
            participant = existing.rows[0];
          } else {
            // Create new participant
            const result = await db.query(
              'INSERT INTO participants (quiz_id, wallet, name) VALUES ($1, $2, $3) RETURNING *',
              [quizId, wallet, name || null]
            );
            participant = result.rows[0];
          }
          
          socket.data.participantId = participant.id;
          
          // Broadcast to everyone in the room (including host)
          io.to(room).emit('player_joined', {
            id: participant.id,
            wallet: participant.wallet,
            name: participant.name,
            joined_at: participant.joined_at
          });
          
          console.log(`✅ Player ${wallet} joined room ${room}`);
        } else {
          console.log(`✅ Host ${wallet} joined room ${room}`);
        }
        
        // Send current room count to the socket that just joined
        const roomSize = io.sockets.adapter.rooms.get(room)?.size || 0;
        socket.emit('room_joined', { 
          quizId, 
          room, 
          participants: roomSize - 1 // Exclude host
        });
        
      } catch (err) {
        console.error('❌ Error in join_quiz:', err);
        socket.emit('error', { message: 'Failed to join quiz' });
      }
    });

    socket.on('start_game', ({ quizId }) => {
      if (!socket.data.isHost) {
        socket.emit('error', { message: 'Only host can start game' });
        return;
      }
      
      const room = `quiz_${quizId}`;
      console.log(`🎮 Host starting game for ${room}`);
      
      // Notify all players in the room
      io.to(room).emit('game_started', { 
        quizId, 
        started: true,
        startedAt: Date.now()
      });
      
      console.log(`✅ Game started signal sent to ${room}`);
    });

    socket.on('submit_answer', async ({ quizId, questionIndex, selectedOption }) => {
      const participantId = socket.data.participantId;
      
      if (!participantId) {
        socket.emit('error', { message: 'Not registered as participant' });
        return;
      }
      
      try {
        // Check if already answered
        const existing = await db.query(
          'SELECT id FROM answers WHERE quiz_id = $1 AND participant_id = $2 AND question_index = $3',
          [quizId, participantId, questionIndex]
        );
        
        if (existing.rowCount > 0) {
          socket.emit('error', { message: 'Already answered this question' });
          return;
        }
        
        // Store answer
        const result = await db.query(
          'INSERT INTO answers (quiz_id, participant_id, question_index, selected_option, answered_at) VALUES ($1, $2, $3, $4, now()) RETURNING *',
          [quizId, participantId, questionIndex, selectedOption]
        );
        
        socket.emit('answer_accepted', { 
          questionIndex, 
          answeredAt: result.rows[0].answered_at 
        });
        
        console.log(`✅ Answer submitted: Quiz ${quizId}, Q${questionIndex}, Participant ${participantId}`);
        
      } catch (err) {
        console.error('❌ Error submitting answer:', err);
        socket.emit('error', { message: 'Failed to submit answer' });
      }
    });

    socket.on('leave_room', async (payload) => {
      const { quizId } = payload;
      socket.leave(quizId);
      io.to(quizId).emit('player_left', { socketId: socket.id });
    });

    // host can start quiz (record started flag in DB and tell clients)
    socket.on('host_start', async ({ quizId }) => {
      try {
        await db.query('UPDATE quizzes SET started = true, started_at = now() WHERE id = $1', [quizId]);
        io.to(quizId).emit('quiz_started', { quizId, startedAt: new Date().toISOString() });
      } catch (err) {
        console.error('host_start error', err);
      }
    });

    // host can emit question (host-managed flow), server simply relays
    socket.on('host_emit_question', ({ quizId, questionIndex, questionObj }) => {
      io.to(quizId).emit('question', { questionIndex, question: questionObj });
    });

    socket.on('get_leaderboard', async ({ quizId }) => {
      try {
        const participants = await db.query(
          `SELECT 
            p.id,
            p.wallet,
            p.name,
            p.score,
            COUNT(a.id) FILTER (WHERE a.is_correct = true) as correct_answers
          FROM participants p
          LEFT JOIN answers a ON a.participant_id = p.id
          WHERE p.quiz_id = $1
          GROUP BY p.id
          ORDER BY p.score DESC`,
          [quizId]
        );
        
        socket.emit('leaderboard_update', {
          quizId,
          leaderboard: participants.rows
        });
        
      } catch (err) {
        console.error('❌ Error fetching leaderboard:', err);
      }
    });

    socket.on('disconnect', () => {
      console.log('🔌 Socket disconnected:', socket.id);
      
      // Notify room if player disconnected
      if (socket.data.quizId && socket.data.wallet && !socket.data.isHost) {
        const room = `quiz_${socket.data.quizId}`;
        io.to(room).emit('player_left', {
          wallet: socket.data.wallet,
          socketId: socket.id
        });
      }
    });
  });
}

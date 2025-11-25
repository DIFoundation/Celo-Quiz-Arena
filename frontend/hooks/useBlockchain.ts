// hooks/useBlockchain.ts
"use client"

import { useConnection, useWriteContract, useReadContract, useWaitForTransactionReceipt, useAccount } from "wagmi"
import { parseEther, formatEther } from "viem"
import { quizFactory, quizGame } from "@/lib/abi"

const FACTORY_ADDRESS = process.env.NEXT_PUBLIC_QUIZ_FACTORY_ADDRESS as `0x${string}`

export function useQuizFactory() {
  const { address } = useConnection()
  const { writeContractAsync, data: hash, isPending } = useWriteContract()
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash })

  /**
   * Create a new quiz on the blockchain
   */
  const createQuiz = async (params: {
    token: string
    numWinners: number
    percentages: number[]
    equalSplit: boolean
    metadataURI: string
  }) => {
    if (!address) throw new Error("Wallet not connected")

    try {
      const txHash = await writeContractAsync({
        address: FACTORY_ADDRESS,
        abi: quizFactory,
        functionName: "createQuiz",
        args: [
          params.token as `0x${string}`,
          BigInt(params.numWinners),
          params.percentages.map((p) => BigInt(p)),
          params.equalSplit,
          params.metadataURI,
        ],
      })

      return txHash
    } catch (error) {
      console.error("Error creating quiz:", error)
      throw error
    }
  }

  /**
   * Get all quizzes created by a host
   */
  const { data: hostQuizzes } = useReadContract({
    address: FACTORY_ADDRESS,
    abi: quizFactory,
    functionName: "getHostQuizzes",
    args: address ? [address] : undefined,
  })

  return {
    createQuiz,
    hostQuizzes: hostQuizzes as `0x${string}`[] | undefined,
    isPending,
    isConfirming,
    isSuccess,
    hash,
  }
}

export function useQuizGame(quizAddress: `0x${string}` | undefined) {
  const { address } = useAccount()
  const { writeContractAsync } = useWriteContract()

  /**
   * Fund quiz prize pool with native CELO
   */
  const fundPrizePoolNative = async (amount: string) => {
    if (!quizAddress) throw new Error("Quiz address not provided")
    if (!address) throw new Error("Wallet not connected")

    try {
      const txHash = await writeContractAsync({
        address: quizAddress,
        abi: quizGame,
        functionName: "fundPrizePoolNative",
        value: parseEther(amount),
      })

      return txHash
    } catch (error) {
      console.error("Error funding prize pool:", error)
      throw error
    }
  }

  /**
   * Start the quiz on-chain
   */
  const startQuiz = async () => {
    if (!quizAddress) throw new Error("Quiz address not provided")

    try {
      const txHash = await writeContractAsync({
        address: quizAddress,
        abi: quizGame,
        functionName: "startQuiz",
      })

      return txHash
    } catch (error) {
      console.error("Error starting quiz:", error)
      throw error
    }
  }

  /**
   * Finalize quiz and payout winners
   */
  const finalizeAndPayout = async (winners: `0x${string}`[]) => {
    if (!quizAddress) throw new Error("Quiz address not provided")

    try {
      const txHash = await writeContractAsync({
        address: quizAddress,
        abi: quizGame,
        functionName: "finalizeAndPayout",
        args: [winners],
      })

      return txHash
    } catch (error) {
      console.error("Error finalizing quiz:", error)
      throw error
    }
  }

  /**
   * Cancel quiz before start
   */
  const cancelQuiz = async () => {
    if (!quizAddress) throw new Error("Quiz address not provided")

    try {
      const txHash = await writeContractAsync({
        address: quizAddress,
        abi: quizGame,
        functionName: "cancelQuiz",
      })

      return txHash
    } catch (error) {
      console.error("Error cancelling quiz:", error)
      throw error
    }
  }

  /**
   * Get quiz info from blockchain
   */
  const { data: quizInfo, refetch: refetchQuizInfo } = useReadContract({
    address: quizAddress,
    abi: quizGame,
    functionName: "getQuizInfo",
  })

  const formattedQuizInfo = quizInfo
    ? {
        host: quizInfo[0],
        token: quizInfo[1],
        metadataURI: quizInfo[2],
        numWinners: Number(quizInfo[3]),
        equalSplit: quizInfo[4],
        prizePool: formatEther(quizInfo[5] as bigint),
        started: quizInfo[6],
        finalized: quizInfo[7],
        cancelled: quizInfo[8],
      }
    : null

  return {
    fundPrizePoolNative,
    startQuiz,
    finalizeAndPayout,
    cancelQuiz,
    quizInfo: formattedQuizInfo,
    refetchQuizInfo,
  }
}

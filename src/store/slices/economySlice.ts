import type { Transaction, Loan } from '../../types'
import { BALANCE } from '../../game/data/constants'

export interface EconomySlice {
  balance: number
  transactions: Transaction[]
  loans: Loan[]
  addTransaction: (tx: Omit<Transaction, 'day'>, day: number) => void
  addLoan: (loan: Loan) => void
  tickLoans: () => void
}

export const createEconomySlice = (
  set: (fn: (state: EconomySlice) => Partial<EconomySlice>) => void
): EconomySlice => ({
  balance: BALANCE.STARTING_CASH,
  transactions: [],
  loans: [],

  addTransaction: (tx, day) =>
    set((state) => ({
      balance: state.balance + tx.amount,
      transactions: [...state.transactions.slice(-269), { ...tx, day }],
    })),

  addLoan: (loan) =>
    set((state) => ({
      balance: state.balance + loan.principal,
      loans: [...state.loans, loan],
    })),

  tickLoans: () =>
    set((state) => {
      let delta = 0
      const updatedLoans = state.loans
        .map((loan) => {
          delta -= loan.dailyPayment
          return { ...loan, daysRemaining: loan.daysRemaining - 1 }
        })
        .filter((loan) => loan.daysRemaining > 0)
      return { balance: state.balance + delta, loans: updatedLoans }
    }),
})

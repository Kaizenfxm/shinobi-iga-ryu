import { type UserData, type WeightData } from "./api";

export async function schedulePaymentNotifications(_user: UserData): Promise<void> {
}

export async function cancelPaymentNotifications(): Promise<void> {
}

export async function scheduleWeightReminder(_userId: number, _weightData: WeightData): Promise<void> {
}

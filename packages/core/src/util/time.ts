export const now = () => new Date()
export const minutesFromNow = (mins: number) => new Date(Date.now() + mins * 60_000)

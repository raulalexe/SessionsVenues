export type Coordinate = {
    x: number
    y: number
}

export type SessionEvent = {
    userTimeUtc: string
    position: Coordinate
}

export type UserSession = {
    userId: string
    sessionId: string
    startTimeUtc: string
    endTimeUtc: string
    startTimeLocal: string
    path: SessionEvent[]
}

export type Venue = {
    id: string
    name: string
    position: Coordinate
}

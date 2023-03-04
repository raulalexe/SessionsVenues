"use strict"
import { Coordinate, SessionEvent, UserSession, Venue} from "./models"
import axios from "axios"

const VenuesUrl = "https://tinyurl.com/2xwsu5y5"
const SessionsUrl = "https://tinyurl.com/mr8nu9ue"

const getData = async <T,>(url: string): Promise<T[]|undefined> => {
  try {
    const resp = await axios.get<T[]>(url)
    return resp?.data
  } catch (err) {
    log(err)
  }
}

const log = (data: any): void => { console.log(data) }

const wasVisit = (userPostion: Coordinate, venuePosition: Coordinate): boolean => {
  const xMatches = (userPostion.x - venuePosition.x) <= 2 && (userPostion.x - venuePosition.x) >= -2
  const yMatches = (userPostion.y - venuePosition.y) <= 2 && (userPostion.y - venuePosition.y) >= -2
  return xMatches && yMatches
}

const getDucatiVisitors = (sessions: UserSession[], venues: Venue[]): Array<string> => {
  const ducatiVenue = venues.find((v: Venue) => v.name.trim() === "Ducati")
  const sessionsVisitingDucati = getVisitors(sessions, ducatiVenue!)
  const ducatiVisitorIds = sessionsVisitingDucati.map((v: UserSession): string => v.userId)
  // Since a user may have multiple sessions get the unique user ids
  const ducatiUniqueVisitors = [...new Set(ducatiVisitorIds)];
  return ducatiUniqueVisitors;
}

const getGateVisitors = (sessions: UserSession[], venues: Venue[]): Object => {
  const gateVisitors: { [x: string]: number } = {}
  const gateVenues = venues.filter((v: Venue) => v.name.match(/^Gate\s*\d$/i))
  gateVenues.map((gv: Venue) => {
    const visits = getVisitors(sessions, gv)
    gateVisitors[gv.name] = [...new Set(visits.map((visit: UserSession) => visit.userId))].length
  })
  return gateVisitors
}

const getTimeAtVenues = (sessions: UserSession[], venues: Venue[]): Object => {
  const timesAtVenues = venues.map((v: Venue) => {
    return sessions.map((s: UserSession) => {
      const pathsAtVenue = s.path.filter((p: SessionEvent) => {
        return wasVisit(p.position, v.position)
      })
      const sortedPaths = s.path.sort((a,b) => Date.parse(a.userTimeUtc) - Date.parse(b.userTimeUtc))
      return pathsAtVenue.map((pav: SessionEvent): Object => {
        const pavIdx = sortedPaths.indexOf(pav)
        const nextPath = sortedPaths[pavIdx + 1]
        const secondsAtVenue = (Date.parse(nextPath.userTimeUtc) - Date.parse(pav.userTimeUtc))/1000
        return {
          venue: v.name,
          person: s.userId,
          secondsAtVenue
        }
      })
    })
  }).flat().flat() //use flat() twice to remove nested arrays and empty arrays
  const summedTimesAtVenuesPerUser = timesAtVenues.reduce((res: Array<any>, value: any): any[] => {
    const existingEntry = res.find((x: {venue: string, person: string, secondsAtVenue: number}) => x.person === value.person)
    if (!existingEntry) {
      res.push(value)
    } else {
      res[res.indexOf(existingEntry)].secondsAtVenue += value.secondsAtVenue
    }
    return res
  }, [] as Array<any>)
  return summedTimesAtVenuesPerUser
}

const getVisitors = (sessions: UserSession[], venue: Venue) => {
  return sessions.filter((s: UserSession) => {
    return s.path.some((p: SessionEvent) => {
      return wasVisit(p.position, venue.position)
    })
  })
}

(async () => {
  try {
    const sessions = await getData<UserSession>(SessionsUrl)
    const venues = await getData<Venue>(VenuesUrl)
    if (!sessions){
      log("No sessions data available. Exiting...")
      return
    } else if (!venues){
      log("No venues data available. Exiting...")
      return
    }
    
    const ducatiVisitors = getDucatiVisitors(sessions, venues)
    const gateVisitors = getGateVisitors(sessions, venues)
    const timeAtVenues = getTimeAtVenues(sessions, venues)

    const result = {
      ducatiVisitorsCount: ducatiVisitors!.length,
      gateVisitors: gateVisitors,
      timeAtVenues: timeAtVenues
    }
    log(result)
    return result
  } catch (err) {
    log(err)
  }
})()


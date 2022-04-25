declare module 'trello' {

    type TrelloCallback<T> = (error: Error | null, result: T) => void
    interface TrelloExtraParams {
        [name: string]: string | number | boolean
    }

    export default class Trello {
        constructor(key: string, token: string)

        makeRequest(requestMethod: string, path: string, query: TrelloExtraParams, callback: TrelloCallback<any>): void
        makeRequest(requestMethod: string, path: string, query: TrelloExtraParams): Promise<any>

        getCard(boardId: string, cardId: string, extraParams?: TrelloExtraParams): Promise<any>

        updateCard(cardId: string, field: string, value: string, extraParams?: TrelloExtraParams): Promise<any>

        getMember(memberId: string, callback: TrelloCallback<any>): void
        getMember(memberId: string, extraParams: TrelloExtraParams, callback: TrelloCallback<any>): void
        getMember(memberId: string, extraParams?: TrelloExtraParams): Promise<any>


        updateLabelColor(labelId: string, color: string, callback: TrelloCallback<any>): void
        updateLabelColor(labelId: string, color: string, extraParams: TrelloExtraParams, callback: TrelloCallback<any>): void
        updateLabelColor(labelId: string, color: string, extraParams?: TrelloExtraParams): Promise<any>


    }

    /** https://developers.trello.com/v1.0/reference#board-object  */
    export interface Board {
        id: string
        name: string
        desc: string
        descData: string | null
        closed: boolean
        idOrganisation: string
        pinned: boolean
        url: string
        shortUrl: string
        prefs: any
        labelNames: {
            [color: string]: string
        }
        starred: boolean
        limits: any
        memberships: Membership[]
    }

    /* https://developers.trello.com/reference#list-object */
    export interface List {
        id: string
        name: string
        closed: boolean
        idBoard: string
        pos: number
        subscribed: boolean
    }

    /* https://developers.trello.com/reference#card-object */
    export interface Card {
        id: string
        badges: Badges
        checkItemStates: any[]
        closed: boolean
        dateLastActivity: string
        desc: string
        descData: any
        due?: string
        dueComplete: boolean
        idAttachmentCover?: string
        idBoard: string
        idChecklists: string[]
        idLabels: string[]
        idList: string
        idMembers: string[]
        idMembersVoted: string[]
        idShort: number
        labels: Label[]
        manualCoverAttachment: boolean
        name: string
        pos: number
        shortLink: string
        shortUrl: string
        subscribed: boolean
        url: string
        address: string
        locationName: string
        coordinates: Coordinates
    }

    export interface Badges {
        votes: number
        viewingMemberVoted: boolean
        subscribed: boolean
        fogbugz: string
        checkItems: number
        checkItemsChecked: number
        comments: number
        attachments: number
        description: boolean
        due: string | null
        dueComplete: boolean
    }

    export type Coordinates = string | { latitude: number, longitude: number }

    export interface Label {
        id: string
        name: string
        color: string
    }

    export interface Membership {
        id: string
        idMember: string
        memberType: string
        unconfirmed: boolean
    }

}

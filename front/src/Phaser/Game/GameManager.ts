import {GameSceneInterface, GameScene} from "./GameScene";
import {ROOM} from "../../Enum/EnvironmentVariable"
import {Connexion, ConnexionInterface, ListMessageUserPositionInterface} from "../../Connexion";

export enum StatusGameManagerEnum {
    IN_PROGRESS = 1,
    CURRENT_USER_CREATED = 2
}

export let ConnexionInstance : ConnexionInterface;

export interface GameManagerInterface {
    GameScenes: Array<GameSceneInterface>;
    status : number;
    createCurrentPlayer() : void;
    shareUserPosition(ListMessageUserPosition : ListMessageUserPositionInterface): void;
}
export class GameManager implements GameManagerInterface {
    GameScenes: Array<GameSceneInterface> = [];
    status: number;
    private ConnexionInstance: Connexion;

    constructor() {
        this.status = StatusGameManagerEnum.IN_PROGRESS;
        this.configureGame();
    }
    
    connect(email:string) {
        this.ConnexionInstance = new Connexion(email, this);
        return this.ConnexionInstance.createConnexion()
    }

    /**
     * permit to config rooms
     */
    configureGame() {
        ROOM.forEach((roomId) => {
            let newGame = new GameScene(roomId, this);
            this.GameScenes.push((newGame as GameSceneInterface));
        });
    }

    /**
     * Permit to create player in started room
     * @param RoomId
     * @param UserId
     */
    createCurrentPlayer(): void {
        //Get started room send by the backend
        let game: GameSceneInterface = this.GameScenes.find((Game: GameSceneInterface) => Game.RoomId === this.ConnexionInstance.startedRoom);
        game.createCurrentPlayer(this.ConnexionInstance.userId);
        this.status = StatusGameManagerEnum.CURRENT_USER_CREATED;
    }

    /**
     * Share position in game
     * @param ListMessageUserPosition
     */
    shareUserPosition(ListMessageUserPosition: ListMessageUserPositionInterface): void {
        if (this.status === StatusGameManagerEnum.IN_PROGRESS) {
            return;
        }
        try {
            let Game: GameSceneInterface = this.GameScenes.find((Game: GameSceneInterface) => Game.RoomId === ListMessageUserPosition.roomId);
            if (!Game) {
                return;
            }
            Game.shareUserPosition(ListMessageUserPosition.listUsersPosition)
        } catch (e) {
            console.error(e);
        }
    }
}

export const gameManager = new GameManager();
import {HtmlUtils} from "./HtmlUtils";

export type CoWebsiteStateChangedCallback = () => void;

enum iframeStates {
    closed = 1,
    loading, // loading an iframe can be slow, so we show some placeholder until it is ready
    opened,
}

const cowebsiteDivId = "cowebsite"; // the id of the parent div of the iframe.
const animationTime = 500; //time used by the css transitions, in ms.

class CoWebsiteManager {
    
    private opened: iframeStates = iframeStates.closed; 

    private observers = new Array<CoWebsiteStateChangedCallback>();
    /**
     * Quickly going in and out of an iframe trigger can create conflicts between the iframe states.
     * So we use this promise to queue up every cowebsite state transition
     */
    private currentOperationPromise: Promise<void> = Promise.resolve(); 
    
    private close(): HTMLDivElement {
        const cowebsiteDiv = HtmlUtils.getElementByIdOrFail<HTMLDivElement>(cowebsiteDivId);
        cowebsiteDiv.classList.remove('loaded'); //edit the css class to trigger the transition
        cowebsiteDiv.classList.add('hidden');
        this.opened = iframeStates.closed;
        return cowebsiteDiv;
    }
    private load(): HTMLDivElement {
        const cowebsiteDiv = HtmlUtils.getElementByIdOrFail<HTMLDivElement>(cowebsiteDivId);
        cowebsiteDiv.classList.remove('hidden'); //edit the css class to trigger the transition
        cowebsiteDiv.classList.add('loading');
        this.opened = iframeStates.loading;
        return cowebsiteDiv;
    }
    private open(): HTMLDivElement {
        const cowebsiteDiv = HtmlUtils.getElementByIdOrFail<HTMLDivElement>(cowebsiteDivId);
        cowebsiteDiv.classList.remove('loading', 'hidden'); //edit the css class to trigger the transition
        this.opened = iframeStates.opened;
        return cowebsiteDiv;
    }

    public loadCoWebsite(url: string): void {
        const cowebsiteDiv = this.load();
        cowebsiteDiv.innerHTML = '';

        const iframe = document.createElement('iframe');
        iframe.id = 'cowebsite-iframe';
        iframe.src = url;
        const onloadPromise = new Promise((resolve) => {
            iframe.onload = () => resolve();
        });
        cowebsiteDiv.appendChild(iframe);
        const onTimeoutPromise = new Promise((resolve) => {
            setTimeout(() => resolve(), 2000);
        });
        this.currentOperationPromise = this.currentOperationPromise.then(() =>Promise.race([onloadPromise, onTimeoutPromise])).then(() => {
            this.open();
            setTimeout(() => {
                this.fire();
            }, animationTime)
        }).catch(() => this.closeCoWebsite());
    }

    /**
     * Just like loadCoWebsite but the div can be filled by the user.
     */
    public insertCoWebsite(callback: (cowebsite: HTMLDivElement) => Promise<void>): void {
        const cowebsiteDiv = this.load();
        this.currentOperationPromise = this.currentOperationPromise.then(() => callback(cowebsiteDiv)).then(() => {
            this.open();
            setTimeout(() => {
                this.fire();
            }, animationTime)
        }).catch(() => this.closeCoWebsite());
    }

    public closeCoWebsite(): Promise<void> {
        this.currentOperationPromise = this.currentOperationPromise.then(() => new Promise((resolve, reject) => {
            if(this.opened === iframeStates.closed) resolve(); //this method may be called twice, in case of iframe error for example
            const cowebsiteDiv = this.close();
            this.fire();
            setTimeout(() => {
                resolve();
                setTimeout(() => cowebsiteDiv.innerHTML = '', 500)
            }, animationTime)
        }));
        return this.currentOperationPromise;
    }

    public getGameSize(): {width: number, height: number} {
        if (this.opened !== iframeStates.opened) {
            return {
                width: window.innerWidth,
                height: window.innerHeight
            }
        }
        if (window.innerWidth >= window.innerHeight) {
            return {
                width: window.innerWidth / 2,
                height: window.innerHeight
            }
        } else {
            return {
                width: window.innerWidth,
                height: window.innerHeight / 2
            }
        }
    }

    public onStateChange(observer: CoWebsiteStateChangedCallback) {
        this.observers.push(observer);
    }

    private fire(): void {
        for (const callback of this.observers) {
            callback();
        }
    }
}

export const coWebsiteManager = new CoWebsiteManager();
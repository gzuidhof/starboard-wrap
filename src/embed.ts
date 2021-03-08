/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

// @ts-ignore - no types available for iframe-resizer
import {default as iFrameResizer} from "iframe-resizer/js/iframeResizer";

import {ContentUpdateMessage, InboundNotebookMessage, NotebookMessage, OutboundNotebookMessage, ReadySignalMessage, SaveMessage} from "starboard-notebook/dist/src/messages/types"

export type StarboardNotebookIFrameOptions<ReceivedMessageType = OutboundNotebookMessage> = {
    src: string;

    autoResize: boolean;
    inPageLinks: boolean;

    notebookContent?: Promise<string> | string;

    onNotebookReadySignalMessage(payload: ReadySignalMessage['payload']): void;
    onSaveMessage(payload: SaveMessage['payload']): void;
    onContentUpdateMessage(payload: ContentUpdateMessage['payload']): void;
    onMessage(message: ReceivedMessageType): void;

    sandbox: string;
    debug: boolean;
}

export type StarboardNotebookMessage = {
    type: "SIGNAL_READY" | "SET_NOTEBOOK_CONTENT" | "NOTEBOOK_CONTENT_UPDATE" | "SAVE";
}

function loadDefaultSettings(opts: Partial<StarboardNotebookIFrameOptions>, el: StarboardNotebookIFrame): StarboardNotebookIFrameOptions {
    return {
        // We fall back to a specific starboard package version on jsdelivr, but ideally one would always specify their own URL that is locked to a specific version.
        src: opts.src ?? el.getAttribute("src") ?? "starboard-notebook-iframe-src-not-set",
        autoResize: opts.autoResize ?? true,
        inPageLinks: opts.inPageLinks ?? true,
        sandbox: opts.sandbox ?? el.getAttribute("sandbox") ?? "allow-scripts allow-modals allow-same-origin allow-pointer-lock allow-top-navigation-by-user-activation allow-forms allow-downloads",
        debug: opts.debug ?? false,
        onNotebookReadySignalMessage: opts.onNotebookReadySignalMessage ?? function(){},
        onContentUpdateMessage: opts.onContentUpdateMessage ?? function(){},
        onSaveMessage: opts.onSaveMessage ?? function(){},
        onMessage: opts.onMessage ?? function(){},
        notebookContent: opts.notebookContent
    }
} 

export class StarboardNotebookIFrame extends HTMLIFrameElement {
    private options?: StarboardNotebookIFrameOptions;
    private constructorOptions: Partial<StarboardNotebookIFrameOptions>;
    public notebookContent: string = "";

    // The version of starboard-wrap
    public version: string = "__STARBOARD_WRAP_VERSION__";

    /**
     * This is set automatically by iframeResizer.
     */
    private iFrameResizer!: any; // TODO check if this is always a list, 

    constructor(opts: Partial<StarboardNotebookIFrameOptions> = {}) {
        super();
        this.constructorOptions = opts;
    }

    connectedCallback() {
        this.options = loadDefaultSettings(this.constructorOptions, this);
        const checkOrigin = [new URL(this.options.src).origin];

        this.sandbox.value = this.options.sandbox;
        this.src = this.options.src;
        this.frameBorder = "0";

        iFrameResizer({
            autoResize: this.options.autoResize, 
            inPageLinks: this.options.inPageLinks,
            checkOrigin: checkOrigin,
            log: this.options.debug,
            onMessage: async (data: {iframe: any, message: OutboundNotebookMessage}) => {
                const msg = data.message;
                if (msg.type === "NOTEBOOK_READY_SIGNAL") {
                    if (this.options!.notebookContent) {
                        const content = await this.options!.notebookContent;
                        this.sendMessage({
                            type: "NOTEBOOK_SET_INIT_DATA", payload: {content}
                        });
                    } else {
                        this.notebookContent = msg.payload.content;
                    }
                    this.options!.onNotebookReadySignalMessage(msg.payload);
                } else if (msg.type === "NOTEBOOK_CONTENT_UPDATE") {
                    this.notebookContent = msg.payload.content;
                    this.options!.onContentUpdateMessage(msg.payload);
                } else if (msg.type === "NOTEBOOK_SAVE_REQUEST") {
                    this.notebookContent = msg.payload.content;
                    this.options!.onSaveMessage(msg.payload);
                }
                this.options!.onMessage(msg);
            },
            onReady: () => {},
        }, this)
    }

    public sendMessage(message: InboundNotebookMessage) {
        this.iFrameResizer.sendMessage(message);
    }

    public sendCustomMessage(message: NotebookMessage<string, any>) {
        this.sendMessage(message as any);
    }

    public dispose() {
        this.iFrameResizer.close();
    }

}

customElements.define('starboard-notebook-iframe', StarboardNotebookIFrame, {extends: 'iframe'})
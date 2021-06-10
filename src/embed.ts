/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

// @ts-ignore - no types available for iframe-resizer
import {
  ContentUpdateMessage,
  InboundNotebookMessage,
  NotebookMessage,
  OutboundNotebookMessage,
  ReadySignalMessage,
  SaveMessage,
} from "starboard-notebook/dist/src/types/messages";
import { flatPromise } from "./flatPromise";

export type StarboardNotebookIFrameOptions<ReceivedMessageType = OutboundNotebookMessage> = {
  /**
   * Optionally you can pass the iframe to attach to. If you don't pass one here
   * an iframe will be created as a child unless the starboard-embed element already has an iframe as a child.
   */
  iFrame: HTMLIFrameElement | null;
  src: string;

  autoResize: boolean;

  baseUrl?: string;

  /**
   * Notebook content to initialize the iframe with
   */
  notebookContent?: Promise<string> | string;

  onNotebookReadySignalMessage(payload: ReadySignalMessage["payload"]): void;

  /**
   * Should return whether the saving was succesful or not.
   */
  onSaveMessage(payload: SaveMessage["payload"]): void | boolean | Promise<boolean>;
  onContentUpdateMessage(payload: ContentUpdateMessage["payload"]): void;
  onMessage(message: ReceivedMessageType): void;
  onUnsavedChangesStatusChange(hasUnsavedChanges: boolean): void;

  /**
   * Custom iframe sandboxing attributes
   */
  sandbox: string;
  preventNavigationWithUnsavedChanges: boolean;
};

export type StarboardNotebookMessage = {
  type: "SIGNAL_READY" | "SET_NOTEBOOK_CONTENT" | "NOTEBOOK_CONTENT_UPDATE" | "SAVE";
};

function loadDefaultSettings(
  opts: Partial<StarboardNotebookIFrameOptions>,
  el: HTMLIFrameElement
): StarboardNotebookIFrameOptions {
  return {
    iFrame: opts.iFrame || null,
    src:
      opts.src ??
      el.getAttribute("src") ??
      (window as any).starboardEmbedIFrameSrc ??
      "https://unpkg.com/starboard-notebook@0.11.1/dist/index.html",
    baseUrl: opts.baseUrl || el.dataset["baseUrl"] || undefined,
    autoResize: opts.autoResize ?? true,
    sandbox:
      opts.sandbox ??
      el.getAttribute("sandbox") ??
      "allow-scripts allow-modals allow-same-origin allow-pointer-lock allow-top-navigation-by-user-activation allow-forms allow-downloads",
    onNotebookReadySignalMessage: opts.onNotebookReadySignalMessage ?? function () {},
    onContentUpdateMessage: opts.onContentUpdateMessage ?? function () {},
    onSaveMessage: opts.onSaveMessage ?? function () {},
    onMessage: opts.onMessage ?? function () {},
    onUnsavedChangesStatusChange: opts.onUnsavedChangesStatusChange ?? function () {},
    notebookContent: opts.notebookContent,
    preventNavigationWithUnsavedChanges: opts.preventNavigationWithUnsavedChanges ?? false,
  };
}

export class StarboardEmbed extends HTMLElement {
  private options?: StarboardNotebookIFrameOptions;
  private constructorOptions: Partial<StarboardNotebookIFrameOptions>;

  public notebookContent: string = "";
  public lastSavedNotebookContent: string = "";
  /** Has unsaved changes */
  public dirty = false;

  // The version of starboard-wrap
  public version: string = "__STARBOARD_WRAP_VERSION__";

  /**
   * The wrapped iframe element.
   */
  private iFrame: HTMLIFrameElement | null;
  private hasReceivedReadyMessage = flatPromise();
  private iFrameMessageHandler?: (ev: MessageEvent<any>) => void;

  private unsavedChangesWarningFunction?: (e: BeforeUnloadEvent) => any;

  constructor(opts: Partial<StarboardNotebookIFrameOptions> = {}) {
    super();
    this.constructorOptions = opts;
    this.style.display = "block";

    if (this.constructorOptions.iFrame) {
      this.iFrame = this.constructorOptions.iFrame;
    } else {
      this.iFrame = this.querySelector("iframe");
    }
  }

  connectedCallback() {
    if (!this.iFrame) {
      // Find iframe element child, and otherwise create one.
      this.iFrame = this.querySelector("iframe");
      if (!this.iFrame) {
        this.iFrame = document.createElement("iframe");
        this.appendChild(this.iFrame);
      }
    }
    this.iFrame.style.width = "100%";

    this.options = loadDefaultSettings(this.constructorOptions, this.iFrame);
    if (this.options.preventNavigationWithUnsavedChanges) {
      this.unsavedChangesWarningFunction = (e) => {
        if (this.dirty) {
          e.preventDefault();
          e.returnValue = "";
        }
      };
      window.addEventListener("beforeunload", this.unsavedChangesWarningFunction);
    }

    if (!this.options.notebookContent) {
      const scriptEl = this.querySelector("script");
      if (scriptEl) {
        this.options.notebookContent = scriptEl.innerText;
      }
    }

    this.iFrame.sandbox.value = this.options.sandbox;

    // Without this check it will reload the page
    if (this.iFrame.src !== this.options.src) {
      this.iFrame.src = this.options.src;
    }
    this.iFrame.frameBorder = "0";

    this.iFrameMessageHandler = async (ev: MessageEvent<any>) => {
      if (ev.source === null || ev.source !== this.iFrame?.contentWindow) return;

      const options = this.options;
      if (!options) return;

      const checkOrigin = [new URL(options.src, location.origin).origin];
      if (!checkOrigin.includes(ev.origin)) return;

      if (!ev.data) return;
      const msg = ev.data as OutboundNotebookMessage;

      // @ts-ignore // TODO: Remove this ts-ignore once the typings have been updated
      if (msg.type === "NOTEBOOK_RESIZE_REQUEST") {
        const iFrame = this.iFrame;
        if (options.autoResize && iFrame) {
          iFrame.setAttribute("scrolling", "no");
          // Todo: make the width super stable as well
          // iFrame.style.width = `${ev.data.payload.width}px`;
          iFrame.style.height = `${ev.data.payload.height + 2}px`; // Not sure why I need + 2
        }
      } else if (msg.type === "NOTEBOOK_READY_SIGNAL") {
        if (options.notebookContent) {
          const content = await options.notebookContent;
          this.notebookContent = content;
          this.lastSavedNotebookContent = this.notebookContent;
          this.sendMessage({
            type: "NOTEBOOK_SET_INIT_DATA",
            payload: { content, baseUrl: options.baseUrl },
          });
        } else {
          this.notebookContent = msg.payload.content;
          this.lastSavedNotebookContent = this.notebookContent;
        }
        this.hasReceivedReadyMessage.resolve(msg.payload);
        options.onNotebookReadySignalMessage(msg.payload);
      } else if (msg.type === "NOTEBOOK_CONTENT_UPDATE") {
        this.notebookContent = msg.payload.content;
        this.updateDirty();
        options.onContentUpdateMessage(msg.payload);
      } else if (msg.type === "NOTEBOOK_SAVE_REQUEST") {
        this.notebookContent = msg.payload.content;
        this.updateDirty();
        // Make it a promise regardless of return value of the function.
        const r = Promise.resolve(options.onSaveMessage(msg.payload));
        r.then((ret) => {
          if (ret === true) {
            this.lastSavedNotebookContent = msg.payload.content;
            this.updateDirty();
          }
        });
      }

      options.onMessage(msg);
    };

    window.addEventListener("message", this.iFrameMessageHandler);
  }

  public sendMessage(message: InboundNotebookMessage) {
    // Sending messages before the iframe leads to messages being lost, which can happen when the iframe loads slowly.
    this.hasReceivedReadyMessage.promise.then(() => this.iFrame?.contentWindow?.postMessage(message, "*"));
  }

  /**
   * Tell the embed a save has been made with the given content so it can update it's "dirty" status.
   * If no content is supplied, the current content is assumed to be the just saved content.
   */
  public setSaved(content?: string) {
    if (content === undefined) {
      content = this.notebookContent;
    }
    this.lastSavedNotebookContent = content;
    this.updateDirty();
  }

  private updateDirty() {
    const priorDirtyState = this.dirty;
    this.dirty = this.lastSavedNotebookContent !== this.notebookContent;

    if (this.dirty !== priorDirtyState) {
      this.options?.onUnsavedChangesStatusChange(this.dirty);
    }
  }

  public sendCustomMessage(message: NotebookMessage<string, any>) {
    this.sendMessage(message as any);
  }

  public dispose() {
    if (this.iFrameMessageHandler) {
      window.removeEventListener("message", this.iFrameMessageHandler);
    }
    if (this.unsavedChangesWarningFunction) {
      window.removeEventListener("beforeunload", this.unsavedChangesWarningFunction);
    }
  }
}
customElements.define("starboard-embed", StarboardEmbed);

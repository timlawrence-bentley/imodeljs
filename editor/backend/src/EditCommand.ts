/*---------------------------------------------------------------------------------------------
* Copyright (c) Bentley Systems, Incorporated. All rights reserved.
* See LICENSE.md in the project root for license terms and full copyright notice.
*--------------------------------------------------------------------------------------------*/
/** @packageDocumentation
 * @module Editing
 */

import { IModelStatus } from "@bentley/bentleyjs-core";
import { IModelDb, IpcHandler } from "@bentley/imodeljs-backend";
import { BackendIpc } from "@bentley/imodeljs-backend/src/ipc/BackendIpc";
import { EditCommandIpc, editorAppChannel, EditorAppIpc, editorAppIpcVersion } from "@bentley/imodeljs-editor-common";
import { IModelError } from "@bentley/imodeljs-common/lib/IModelError";

/** @alpha */
export type EditCommandType = typeof EditCommand;

/**
 * An EditCommand that performs an editing action on the backend. EditCommands are usually paired with and driven by EditTools on the frontend.
 * EditCommands have a *commandId* that uniquely identifies them, so they can be found via a lookup in the [[EditCommandAdmin]].
 * Every time an EditCommand runs, a new instance of (a subclass of) this class is created
 * @alpha
 */
export class EditCommand implements EditCommandIpc {
  /** The unique string that identifies this EditCommand class. This must be overridden in every subclass. */
  public static commandId = "";
  public static version = "1.0.0";

  /** The iModel this EditCommand may modify. */
  public readonly iModel: IModelDb;

  public constructor(iModel: IModelDb, ..._args: any[]) {
    this.iModel = iModel;
  }
  public get ctor(): EditCommandType { return this.constructor as EditCommandType; }

  public onStart(): void { }

  public async ping() {
    return { version: this.ctor.version, commandId: this.ctor.commandId };
  };

  public onCleanup(): void { }

  public onFinish(): void { }
}

class EditorAppImpl extends IpcHandler implements EditorAppIpc {
  public async getVersion() { return editorAppIpcVersion; }
  public get channelName() { return editorAppChannel; }

  public async startCommand(commandId: string, iModelKey: string, ...args: any[]) {
    const commandClass = EditCommandAdmin.commands.get(commandId);
    if (undefined === commandClass)
      throw new IModelError(IModelStatus.BadArg, `Command Not Found: ${commandId}`);

    return EditCommandAdmin.runCommand(new commandClass(IModelDb.findByKey(iModelKey), ...args));
  }

  public async call(methodName: string, ...args: any[]) {
    const cmd = EditCommandAdmin.activeCommand;
    if (!cmd)
      throw new IModelError(IModelStatus.BadArg, `No active command`);

    const func = (cmd as any)[methodName];
    if (typeof func !== "function")
      throw new IModelError(IModelStatus.BadArg, `Method ${methodName} not found on ${cmd.ctor.commandId}`);

    return func.call(cmd, ...args);
  }
}

/** EditCommandAdmin holds a mapping between commandIds and their corresponding [[EditCommand]] class. This provides the mechanism to
 * run EditCommands by commandId.
 * It also keeps track of the currently active EditCommand. When a new EditCommand starts, the active EditCommand is terminated.
 * @alpha
 */
export class EditCommandAdmin {
  public static readonly commands = new Map<string, EditCommandType>();

  private static _activeCommand?: EditCommand;
  private static _isInitialized = false;
  public static get activeCommand() { return this._activeCommand; }

  public static runCommand(cmd?: EditCommand) {
    if (this._activeCommand)
      this._activeCommand.onFinish();
    this._activeCommand = cmd;
    return cmd ? cmd.onStart() : undefined;
  }

  /**
   * Un-register a previously registered EditCommand class.
   * @param commandId the commandId of a previously registered EditCommand to unRegister.
   */
  public static unRegister(commandId: string) { this.commands.delete(commandId); }

  /**
   * Register an EditCommand class. This establishes a connection between the commandId of the class and the class itself.
   * @param commandType the subclass of Tool to register.
   */
  public static register(commandType: EditCommandType) {
    if (!this._isInitialized) {
      this._isInitialized = true;
      if (!BackendIpc.isValid)
        throw new Error("Edit Commands only allowed in with Ipc");
      EditorAppImpl.register();
    }
    if (commandType.commandId.length !== 0)
      this.commands.set(commandType.commandId, commandType);
  }

  /**
   * Register all the EditCommand classes found in a module.
   * @param modelObj the module to search for subclasses of EditCommand.
   */
  public static registerModule(moduleObj: any) {
    for (const thisMember in moduleObj) {  // eslint-disable-line guard-for-in
      const thisCmd = moduleObj[thisMember];
      if (thisCmd.prototype instanceof EditCommand) {
        this.register(thisCmd);
      }
    }
  }

};

import * as vscode from 'vscode'

import { EDIT_COMMAND, menu_buttons } from '../commands/utils/menu'
import { getActiveEditor } from '../editor/active-editor'

import { FixupTask } from './FixupTask'
import { FixupTaskFactory } from './roles'

/**
 * The UI for creating non-stop fixup tasks by typing instructions.
 */
export class FixupTypingUI {
    constructor(private readonly taskFactory: FixupTaskFactory) {}

    public async getInstructionFromQuickPick({
        title = `${EDIT_COMMAND.description} (${EDIT_COMMAND.slashCommand})`,
        placeholder = 'Your instructions',
        value = '',
        prefix = EDIT_COMMAND.slashCommand,
    } = {}): Promise<string> {
        const quickPick = vscode.window.createQuickPick()
        quickPick.title = title
        quickPick.placeholder = placeholder
        quickPick.buttons = [menu_buttons.back]
        quickPick.value = value

        // VS Code automatically sorts quick pick items by label.
        // We want the 'edit' item to always be first, so we remove this.
        // Property not currently documented, open issue: https://github.com/microsoft/vscode/issues/73904
        ;(quickPick as any).sortByLabel = false

        quickPick.onDidTriggerButton(() => {
            void vscode.commands.executeCommand('cody.action.commands.menu')
            quickPick.hide()
        })

        quickPick.show()

        return new Promise(resolve =>
            quickPick.onDidAccept(() => {
                const instruction = quickPick.value.trim()
                if (!instruction) {
                    // noop
                    return
                }

                quickPick.hide()
                return resolve(prefix ? `${prefix} ${instruction}` : instruction)
            })
        )
    }

    public async show(): Promise<FixupTask | null> {
        const editor = getActiveEditor()
        if (!editor) {
            return null
        }
        const range = editor.selection
        const instruction = (await this.getInstructionFromQuickPick())?.trim()
        if (!instruction) {
            return null
        }
        const CHAT_RE = /^\/chat(|\s.*)$/
        const match = instruction.match(CHAT_RE)
        if (match?.[1]) {
            // If we got here, we have a selection; start chat with match[1].
            await vscode.commands.executeCommand('cody.action.chat', match[1], 'fixup')
            return null
        }

        const task = this.taskFactory.createTask(editor.document.uri, instruction, range)

        // Return focus to the editor
        void vscode.window.showTextDocument(editor.document)

        return task
    }
}

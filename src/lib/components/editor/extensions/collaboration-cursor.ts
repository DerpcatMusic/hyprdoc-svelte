import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';

export interface CursorUser {
	id: string;
	color: string;
	name: string;
	cursor: { from: number; to: number } | null;
}

export interface CollaborationCursorOptions {
	users: CursorUser[];
}

declare module '@tiptap/core' {
	interface Commands<ReturnType> {
		collaborationCursor: {
			updateCollaborationCursors: (users: CursorUser[]) => ReturnType;
		};
	}
}

export const CollaborationCursor = Extension.create<CollaborationCursorOptions>({
	name: 'collaborationCursor',

	addOptions() {
		return {
			users: []
		};
	},

	addCommands() {
		return {
			updateCollaborationCursors:
				(users) =>
				({ tr, dispatch }) => {
					// We store users in valid meta to trigger plugin state update
					if (dispatch) {
						tr.setMeta('collaborationCursor', { users });
					}
					return true;
				}
		};
	},

	addProseMirrorPlugins() {
		return [
			new Plugin({
				key: new PluginKey('collaborationCursor'),
				state: {
					init() {
						return DecorationSet.empty;
					},
					apply(tr, set) {
						const meta = tr.getMeta('collaborationCursor');
						if (meta && meta.users) {
							const users = meta.users as CursorUser[];
							const decorations: Decoration[] = [];

							users.forEach((user) => {
								if (!user.cursor) return;

								const { from, to } = user.cursor;
								if (from === undefined || to === undefined) return;

								// Cursor Decoration (Caret)
								const cursor = document.createElement('div');
								cursor.classList.add('collaboration-cursor__caret');
								cursor.style.borderLeftColor = user.color;
								cursor.style.backgroundColor = user.color;
								
								// Label (Name)
								const label = document.createElement('div');
								label.classList.add('collaboration-cursor__label');
								label.style.backgroundColor = user.color;
								label.textContent = user.name || 'User';
								cursor.appendChild(label);

								decorations.push(
									Decoration.widget(to, cursor, {
										key: `cursor-${user.id}`,
										side: 10
									})
								);

								// Selection Decoration (Background)
								if (from !== to) {
									decorations.push(
										Decoration.inline(
											Math.min(from, to),
											Math.max(from, to),
											{
												style: `background-color: ${user.color}30` // 30 = ~20% opacity
											},
											{ id: `selection-${user.id}` }
										)
									);
								}
							});

							return DecorationSet.create(tr.doc, decorations);
						}

						return set.map(tr.mapping, tr.doc);
					}
				},
				props: {
					decorations(state) {
						return this.getState(state);
					}
				}
			})
		];
	}
});

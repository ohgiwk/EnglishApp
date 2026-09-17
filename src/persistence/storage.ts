import { defaults, migrateSave, type SaveData } from './save'

export const SAVE_KEY = 'love-language-save-v1'
export const RECOVERY_KEY = `${SAVE_KEY}-recovery`
const failureMessage =
  '学習データを保存できませんでした。この画面を閉じる前に、端末の空き容量やブラウザの保存設定を確認してください。'

// Keep unreadable JSON before allowing a later write to replace it.
function readStoredValue(): unknown {
  const raw = localStorage.getItem(SAVE_KEY)
  if (raw === null) return null
  try {
    return JSON.parse(raw)
  } catch {
    localStorage.setItem(RECOVERY_KEY, raw)
    return null
  }
}

export function loadSave(): { save: SaveData; error: string | null } {
  try {
    return { save: migrateSave(readStoredValue()), error: null }
  } catch {
    return { save: defaults(), error: failureMessage }
  }
}

export function writeSave(save: SaveData): string | null {
  try {
    readStoredValue()
    localStorage.setItem(SAVE_KEY, JSON.stringify(save))
    return null
  } catch {
    return failureMessage
  }
}

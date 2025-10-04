import fs from 'node:fs';


const summary = `# 目的\n- preflight失敗(High)の暫定修復案を提示\n\n# 変更概要\n- 小さな差分で再発防止\n- canonical docs を同期\n\n# 受入基準\n- contracts green / preflight High=0（warn基準）\n\n# ロールバック\n- revert: このPRを戻せば元に戻る（DB変更なし）`;


fs.writeFileSync(0 as any, summary); // stdout
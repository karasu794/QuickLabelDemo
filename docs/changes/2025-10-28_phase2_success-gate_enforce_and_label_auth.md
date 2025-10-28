# Phase2: Success Gate enforce & Label Auth
- SUCCESS_GATE_ENFORCE=true のとき、/shipping/new/success はSSRでゲート未成立なら /shipping/new/review に302
- /api/download-label は shipmentId 必須・所有者認可・署名付き短期URLまたはサーバプロキシで配信
- /api/ship/status の completed 判定を payment+label のANDへ


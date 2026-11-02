/** Shaders que existem no EmulatorJS 4.2.3. Confira ao atualizar a versão. */
export const shaderOptions = [
  { value: "disabled", label: "Nenhum" },
  { value: "crt-aperture.glslp", label: "CRT aperture" },
  { value: "crt-beam", label: "CRT beam" },
  { value: "crt-caligari", label: "CRT caligari" },
  { value: "crt-easymode.glslp", label: "CRT easymode" },
  { value: "crt-geom.glslp", label: "CRT geom" },
  { value: "crt-lottes", label: "CRT lottes" },
  { value: "crt-mattias.glslp", label: "CRT mattias" },
  { value: "crt-yeetron", label: "CRT yeetron" },
  { value: "crt-zfast", label: "CRT zfast" },
  { value: "2xScaleHQ.glslp", label: "2xScaleHQ" },
  { value: "4xScaleHQ.glslp", label: "4xScaleHQ" },
  { value: "sabr", label: "SABR" },
  { value: "bicubic", label: "Bicubic" },
  { value: "mix-frames", label: "Mix frames" },
];

/** Botões do RetroPad no EmulatorJS, com o índice usado em `controls`. */
export const gameButtons = [
  { id: 8, label: "A" },
  { id: 0, label: "B" },
  { id: 9, label: "X" },
  { id: 1, label: "Y" },
  { id: 10, label: "L" },
  { id: 11, label: "R" },
  { id: 12, label: "L2" },
  { id: 13, label: "R2" },
  { id: 3, label: "Start" },
  { id: 2, label: "Select" },
  { id: 4, label: "Cima" },
  { id: 5, label: "Baixo" },
  { id: 6, label: "Esquerda" },
  { id: 7, label: "Direita" },
];

/** Ações do menu, com a tecla e o botão padrão do gamepad. */
export const menuActions = [
  { id: "left", label: "Jogo anterior", key: "arrowleft", pad: 14 },
  { id: "right", label: "Próximo jogo", key: "arrowright", pad: 15 },
  { id: "up", label: "Subir no painel", key: "arrowup", pad: 12 },
  { id: "down", label: "Descer no painel", key: "arrowdown", pad: 13 },
  { id: "l", label: "Console anterior (L)", key: "q", pad: 4 },
  { id: "r", label: "Próximo console (R)", key: "e", pad: 5 },
  { id: "y", label: "Ajustes (Y)", key: "y", pad: 3 },
  { id: "a", label: "Confirmar (A)", key: "enter", pad: 0 },
  { id: "b", label: "Voltar (B)", key: "escape", pad: 1 },
];

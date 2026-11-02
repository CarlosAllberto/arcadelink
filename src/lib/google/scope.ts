// drive.file grava na pasta do app; drive.readonly é o que permite ler ROMs enviadas pelo Drive.
export const DRIVE_SCOPE = [
  "https://www.googleapis.com/auth/drive.file",
  "https://www.googleapis.com/auth/drive.readonly",
].join(" ");

COLOQUE SEUS ARQUIVOS DE MIDIA AQUI:

- hero.mp4      -> video cinematografico da landing (hero / scroll story).
                    Se nao existir, o site usa uma animacao 3D de fallback automaticamente.
- poster.jpg    -> imagem de capa exibida enquanto o video carrega (opcional).
- galeria-1.jpg ... galeria-6.jpg -> imagens da secao Galeria (opcional; ha placeholders animados).

Dica: use ffmpeg para otimizar:
  ffmpeg -i original.mp4 -an -vcodec libx264 -crf 28 -preset slow -movflags +faststart hero.mp4

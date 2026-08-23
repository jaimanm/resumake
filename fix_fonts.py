import re

with open('awesome-cv.cls', 'r') as f:
    content = f.read()

source_sans_3_pattern = r"\\setmainfont\{Source Sans 3\}\[\s+UprightFont=\*,\s+ItalicFont=\* Italic,\s+BoldFont=\* Bold,\s+BoldItalicFont=\* Bold Italic,\s+FontFace=\{l\}\{n\}\{Font=\* Light\},\s+FontFace=\{l\}\{it\}\{Font=\* Light Italic\},\s+\]"
source_sans_3_repl = r"""\\setmainfont{SourceSansPro}[
  Extension = .otf,
  UprightFont = *-Regular,
  ItalicFont = *-RegularIt,
  BoldFont = *-Bold,
  BoldItalicFont = *-BoldIt,
  FontFace={l}{n}{Font=*-Light},
  FontFace={l}{it}{Font=*-LightIt},
]"""
content = re.sub(source_sans_3_pattern, source_sans_3_repl, content)

source_sans_3_sans_pattern = r"\\setsansfont\{Source Sans 3\}\[\s+UprightFont=\*,\s+ItalicFont=\* Italic,\s+BoldFont=\* Bold,\s+BoldItalicFont=\* Bold Italic,\s+FontFace=\{l\}\{n\}\{Font=\* Light\},\s+FontFace=\{l\}\{it\}\{Font=\* Light Italic\},\s+\]"
source_sans_3_sans_repl = r"""\\setsansfont{SourceSansPro}[
  Extension = .otf,
  UprightFont = *-Regular,
  ItalicFont = *-RegularIt,
  BoldFont = *-Bold,
  BoldItalicFont = *-BoldIt,
  FontFace={l}{n}{Font=*-Light},
  FontFace={l}{it}{Font=*-LightIt},
]"""
content = re.sub(source_sans_3_sans_pattern, source_sans_3_sans_repl, content)

roboto_pattern = r"\\newfontfamily\\roboto\{Roboto\}\[\s+UprightFont=\*,\s+ItalicFont=\* Italic,\s+BoldFont=\* Bold,\s+BoldItalicFont=\* Bold Italic,\s+FontFace=\{l\}\{n\}\{Font=\* Light\},\s+FontFace=\{l\}\{it\}\{Font=\* Light Italic\},\s+\]"
roboto_repl = r"""\\newfontfamily\\roboto{Roboto}[
  Extension = .otf,
  UprightFont = *-Regular,
  ItalicFont = *-Italic,
  BoldFont = *-Bold,
  BoldItalicFont = *-BoldItalic,
  FontFace={l}{n}{Font=*-Light},
  FontFace={l}{it}{Font=*-LightItalic},
]"""
content = re.sub(roboto_pattern, roboto_repl, content)

with open('awesome-cv.cls', 'w') as f:
    f.write(content)

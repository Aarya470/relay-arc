# Re-extract the pure navigation logic from the component so tests exercise shipped code.
import pathlib
src = pathlib.Path('components/Navigation.tsx').read_text()
g0, g1 = src.index('function distanceBetween'), src.index('// ─── Instructions')
i0, i1 = src.index('interface Step {'), src.index('function TurnGlyph')
mod = '// AUTO-EXTRACTED from components/Navigation.tsx — do not edit by hand\n\n'
mod += 'export ' + src[g0:g1].replace('\nfunction ', '\nexport function ')
mod += '\nexport ' + src[i0:i1].replace('\nfunction ', '\nexport function ')
pathlib.Path('tests/navlogic.extracted.ts').write_text(mod)
print('extracted to tests/navlogic.extracted.ts')

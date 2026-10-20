<h1><img src="logo.svg" alt="" width="40" height="40" align="absmiddle"> Flux unit converter</h1>

Unit conversion for eddy-covariance fluxes of CO₂, CH₄, N₂O and H₂O.

**Web page:** https://holukas.github.io/flux-unit-converter/

## What it converts

- Amount: molar (pmol to mol) or mass (ng to t)
- Basis: molecule, element (C, N), or CO₂-equivalents for CH₄ and N₂O
- Area: m², ha, km²
- Time: s, min, 30 min, h, d, yr (365 d)

Each conversion is listed as a sequence of factors with the intermediate value and unit after each step. The page also contains the SwissFluxNet reference sequences, a batch converter for pasted spreadsheet columns, and the constants used.

## Constants

Atomic weights are the IUPAC 2007 conventional values, as used in the [SwissFluxNet conversion sequences](https://www.swissfluxnet.ethz.ch/index.php/documentation/conversion-sequences/). GWP₁₀₀ values are from IPCC AR6 WG1, Table 7.15: 27 for non-fossil CH₄ and 273 for N₂O.

## Running locally

The page is static and has no build step. Open `index.html` in a browser, or serve the folder:

```bash
python -m http.server
```

Verify results independently before using them in publications.

## License

GPL-3.0. See [LICENSE](LICENSE).

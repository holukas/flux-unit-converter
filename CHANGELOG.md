# Changelog

All notable changes to this project are documented in this file. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and version numbers follow [Semantic Versioning](https://semver.org/).

## [1.0.0] - 2026-10-20

First release.

### Added

- Conversion of eddy-covariance fluxes of CO₂, CH₄, N₂O and H₂O between molar and mass amounts, molecule and element basis (C, N), and CO₂-equivalents for CH₄ and N₂O (IPCC AR6 GWP₁₀₀).
- Area bases m², ha and km²; time bases from s to yr (365 d).
- Conversion sequence showing each factor with the intermediate value and unit after each step.
- SwissFluxNet reference sequences, each checked against its published factor.
- Batch conversion of pasted spreadsheet columns; headers, timestamp columns and −9999 missing values are kept unchanged.
- Table of the constants used (IUPAC 2007 atomic weights, molar masses, GWP₁₀₀).
- 3D model of the selected gas.
- Shareable links that store the current units and value.
- Light and dark theme.

[1.0.0]: https://github.com/holukas/flux-unit-conversions/releases/tag/v1.0.0

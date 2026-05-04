This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Project Structure

- `map.json`: Geometric template for map generation (coordinates for slices and home systems).
- `factions.json`: Detailed information about the 24 available factions (17 Base + 7 POK).
- `src/lib/draft.ts`: Logic for generating balanced slices and draft setups.
- `src/components/map/MapGrid.tsx`: Visual representation of the tactical map with slice transposition.

## Factions & Home Systems

The project includes all 17 base game factions and the 7 factions from the *Prophecy of Kings* (POK) expansion. Home system tiles are mapped as follows:

### Base Game (ST_1 to ST_17)
- **ST_1**: The Federation of Sol (Jord)
- **ST_2**: The Mentak Coalition (Moll Primus)
- **ST_3**: The Yin Brotherhood (Darien)
- **ST_4**: The Embers of Muaat (Muaat)
- **ST_5**: The Arborec (Nestphar)
- **ST_6**: The L1Z1X Mindnet ([0.0.0])
- **ST_7**: The Winnu (Winnu)
- **ST_8**: The Nekro Virus (Mordai II)
- **ST_9**: The Naalu Collective (Maaluuk / Druaa)
- **ST_10**: The Barony of Letnev (Arc Prime / Wren Terra)
- **ST_11**: The Clan of Saar (Lisis II / Ragh)
- **ST_12**: The Universities of Jol-Nar (Jol / Nar)
- **ST_13**: The Sardakk N'orr (Tren'lak / Quinarra)
- **ST_14**: The Xxcha Kingdom (Archon Ren / Archon Tau)
- **ST_15**: The Yssaril Tribes (Retillion / Shaloam)
- **ST_16**: The Emirates of Hacan (Arretze / Hercant / Kamdorn)
- **ST_17**: The Ghosts of Creuss (Creuss)

### Prophecy of Kings Expansion (ST_52 to ST_58)
- **ST_52**: The Mahact Gene-Sorcerers (Ixth)
- **ST_53**: The Nomad (Arcturus)
- **ST_54**: The Vuil'Raith Cabal (Acheron)
- **ST_55**: The Titans of Ul (Elysium)
- **ST_56**: The Empyrean (The Dark)
- **ST_57**: The Naaz-Rokha Alliance (Naazir / Rokha)
- **ST_58**: The Argent Flight (Valk / Avar / Ylir)

For more information, refer to the [Twilight Imperium Wiki](https://twilight-imperium.fandom.com/wiki/Twilight_Imperium_Wiki).

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

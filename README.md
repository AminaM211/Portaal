# Nimbli Portaal

Nimbli is een webapplicatie voor kinesitherapie waarbij kinesisten oefeningen kunnen beheren en toewijzen aan kinderen, terwijl ouders en kinderen de oefenplanning en voortgang kunnen opvolgen. Het project focust op een toegankelijk portaal met rollen voor kinesist, ouder en kind.

Een belangrijk onderdeel van de applicatie is de oefenmodus. Daar gebruikt Nimbli de webcam en pose detection om bepaalde oefeningen automatisch te herkennen en feedback/voortgang bij te houden. Zo wordt thuis oefenen interactiever en krijgt de gebruiker meer begeleiding dan bij een gewone lijst met oefeningen.

## Functionaliteiten

- Inloggen en rolgebaseerde navigatie voor kinesisten, ouders en kinderen.
- Patienten beheren en oefeningen of oefenschema's toewijzen.
- Oefeningen aanmaken, uploaden en categoriseren.
- Kindvriendelijke oefenervaring met voortgang, XP, streaks en missies.
- Automatische herkenning van oefeningen zoals jumping jacks, high knees, plank, shoulder raises, glute bridges en single leg stand.
- Realtime en databasefunctionaliteit via Supabase.

## Technologieen

- React met Vite voor de frontend.
- React Router voor de navigatie tussen rollen en schermen.
- Supabase voor authenticatie, database, storage en realtime updates.
- MediaPipe Pose voor lichaamsherkenning via de webcam.
- Custom exercise detectors voor het tellen en beoordelen van bewegingen.
- Vercel-configuratie voor deployment.

## Nieuwe Technologieen En Meerwaarde

Voor dit eindwerk onderzocht en implementeerde ik pose detection met MediaPipe. De meerwaarde hiervan is dat de applicatie niet enkel oefeningen toont, maar ook actief kan meekijken of een beweging wordt uitgevoerd. Dat maakt het product interactiever en beter afgestemd op kinderen die thuis zelfstandig oefenen.

Daarnaast gebruikt Nimbli Supabase als backend-as-a-service. Hierdoor kon ik authenticatie, databanktabellen, storage en realtime updates sneller integreren zonder een volledige backend vanaf nul te bouwen. De meerwaarde is dat de focus meer kon liggen op de gebruikersflow, oefenlogica en het kinesitherapieconcept.

## Installatie

Installeer de dependencies:

```bash
npm install
```

Maak lokaal een `.env` bestand aan met je Supabase configuratie:

```bash
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

Start de development server:

```bash
npm run dev
```

Maak een productiebuild:

```bash
npm run build
```

## Credentials

API-keys en andere gevoelige gegevens staan niet rechtstreeks in de code. De Supabase configuratie wordt ingeladen via environment variables. Het lokale `.env` bestand staat in `.gitignore` en wordt dus niet mee gepusht naar GitHub.

## Repository

GitHub repository: https://github.com/AminaM211/Portaal

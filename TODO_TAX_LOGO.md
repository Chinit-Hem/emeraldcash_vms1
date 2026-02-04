# TODO: Tax Type Select & Brand Logos Implementation

## Phase 1: Update Tax Type from Input to Select

### Step 1.1: Add Tax Type Options Constant
- [ ] Update `src/lib/types.ts` - Add TAX_TYPE_OPTIONS constant with "Tax Paper" and other options

### Step 1.2: Update Add Vehicle Page
- [ ] Update `src/app/(app)/vehicles/add/page.tsx`
- [ ] Change Tax Type from input+datalist to select dropdown
- [ ] Add "Tax Paper" as the first/default option

### Step 1.3: Update Edit Vehicle Page
- [ ] Update `src/app/(app)/vehicles/[id]/edit/page.tsx`
- [ ] Change Tax Type from input to select dropdown

## Phase 2: Create Brand Logo Components

### Step 2.1: Create Brand Logo Directory
- [ ] Create `src/app/components/brands/` directory

### Step 2.2: Create Individual Brand Logo Components
Create SVG logo components for:
- [ ] MgLogo.tsx
- [ ] LeapmotorLogo.tsx
- [ ] ToyotaLogo.tsx
- [ ] LexusLogo.tsx
- [ ] KiaLogo.tsx
- [ ] FordLogo.tsx
- [ ] LandRoverLogo.tsx
- [ ] MercedesBenzLogo.tsx
- [ ] AudiLogo.tsx
- [ ] BmwLogo.tsx
- [ ] BydLogo.tsx
- [ ] ChevroletLogo.tsx
- [ ] GacLogo.tsx
- [ ] HondaLogo.tsx
- [ ] HyundaiLogo.tsx
- [ ] MazdaLogo.tsx
- [ ] NissanLogo.tsx
- [ ] PorscheLogo.tsx
- [ ] DenzaLogo.tsx
- [ ] MitsubishiLogo.tsx
- [ ] SsangYongLogo.tsx
- [ ] AvatrLogo.tsx
- [ ] CadillacLogo.tsx
- [ ] ChanganLogo.tsx
- [ ] JeepLogo.tsx
- [ ] TeslaLogo.tsx
- [ ] VolkswagenLogo.tsx
- [ ] And 80+ more brands...

### Step 2.3: Create Brand Logo Registry
- [ ] Create `src/app/components/brands/BrandLogos.tsx`
- [ ] Create mapping of brand names to logo components

## Phase 3: Integrate Brand Logos

### Step 3.1: Update View Page
- [ ] Update `src/app/(app)/vehicles/[id]/view/page.tsx`
- [ ] Add brand logo display next to brand name

### Step 3.2: Update Edit Page
- [ ] Update `src/app/(app)/vehicles/[id]/edit/page.tsx`
- [ ] Add brand logo display

## Estimated Total: 100+ tasks


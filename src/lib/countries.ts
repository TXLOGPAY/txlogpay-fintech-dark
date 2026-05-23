// Curated subset of trade-finance relevant jurisdictions.
// Lightweight on purpose — searchable combobox handles filtering.

export interface Country {
  code: string;     // ISO-2
  name: string;     // PT-BR display name
  cities: string[]; // suggestions for autocomplete
}

export const COUNTRIES: Country[] = [
  { code: "CN", name: "China",          cities: ["Shanghai", "Ningbo", "Shenzhen", "Guangzhou", "Hong Kong"] },
  { code: "HK", name: "Hong Kong",      cities: ["Kowloon", "Hong Kong Island"] },
  { code: "US", name: "Estados Unidos", cities: ["Miami", "Los Angeles", "New York", "Houston"] },
  { code: "DE", name: "Alemanha",       cities: ["Hamburg", "Frankfurt", "Bremen", "Munique"] },
  { code: "NL", name: "Holanda",        cities: ["Rotterdam", "Amsterdam"] },
  { code: "IT", name: "Itália",         cities: ["Génova", "Milão", "Nápoles"] },
  { code: "ES", name: "Espanha",        cities: ["Valência", "Barcelona", "Algeciras"] },
  { code: "FR", name: "França",         cities: ["Le Havre", "Marselha", "Paris"] },
  { code: "GB", name: "Reino Unido",    cities: ["Londres", "Felixstowe", "Liverpool"] },
  { code: "JP", name: "Japão",          cities: ["Tóquio", "Yokohama", "Kobe", "Osaka"] },
  { code: "KR", name: "Coreia do Sul",  cities: ["Busan", "Incheon", "Seul"] },
  { code: "IN", name: "Índia",          cities: ["Mumbai", "Nhava Sheva", "Chennai"] },
  { code: "VN", name: "Vietnã",         cities: ["Ho Chi Minh", "Hai Phong"] },
  { code: "SG", name: "Singapura",      cities: ["Singapore"] },
  { code: "AE", name: "Emirados Árabes",cities: ["Dubai", "Abu Dhabi"] },
  { code: "BR", name: "Brasil",         cities: ["Santos", "Itajaí", "Paranaguá", "Rio de Janeiro"] },
  { code: "AR", name: "Argentina",      cities: ["Buenos Aires", "Rosário"] },
  { code: "CL", name: "Chile",          cities: ["Valparaíso", "San Antonio"] },
  { code: "MX", name: "México",         cities: ["Veracruz", "Manzanillo"] },
  { code: "CA", name: "Canadá",         cities: ["Vancouver", "Toronto", "Montreal"] },
  { code: "TR", name: "Turquia",        cities: ["Istambul", "Esmirna"] },
  { code: "ZA", name: "África do Sul",  cities: ["Durban", "Cidade do Cabo"] },
];

export function findCountry(name: string): Country | undefined {
  const q = name.trim().toLowerCase();
  return COUNTRIES.find((c) => c.name.toLowerCase() === q || c.code.toLowerCase() === q);
}

export function suggestCities(countryName: string): string[] {
  return findCountry(countryName)?.cities ?? [];
}

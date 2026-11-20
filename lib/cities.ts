export const CITIES = [
  { id: "delhi-ncr", label: "Delhi NCR", latitude: 28.6139, longitude: 77.209 },
  { id: "lucknow", label: "Lucknow", latitude: 26.8467, longitude: 80.9462 },
  { id: "kanpur", label: "Kanpur", latitude: 26.4499, longitude: 80.3319 },
  { id: "patna", label: "Patna", latitude: 25.5941, longitude: 85.1376 },
  { id: "kolkata", label: "Kolkata", latitude: 22.5726, longitude: 88.3639 },
  { id: "mumbai", label: "Mumbai", latitude: 19.076, longitude: 72.8777 },
] as const;

export type CityId = (typeof CITIES)[number]["id"];
export const CITY_IDS = CITIES.map((c) => c.id) as [CityId, ...CityId[]];
export const cityById = (id: string) => CITIES.find((c) => c.id === id);

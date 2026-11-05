import Storage from 'expo-sqlite/kv-store';

// Seçili aracın kimliği. Ayrı dosyada: widget da okur, araç kodunu içe aktarmadan (birbirini çağıran bağımlılık olmasın).
export const ACTIVE_VEHICLE_KEY = 'state.activeVehicle';

export function activeVehicleId(): string | null {
  return Storage.getItemSync(ACTIVE_VEHICLE_KEY);
}

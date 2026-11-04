import { parseNumber, validateVehicle, type VehicleInput } from './validation';

const valid: VehicleInput = {
  name: 'Clio',
  make: 'Renault',
  model: 'Clio',
  year: '2019',
  plate: '34 abc 123',
  plateForeign: false,
  fuelTypes: ['petrol', 'lpg'],
  tankLiters: '45',
  odometerKm: '87.421',
};

describe('parseNumber', () => {
  it.each([
    ['6,5', 6.5],
    ['6.5', 6.5],
    ['120.000', 120000],
    ['1.250,75', 1250.75],
    [' 87 421 ', 87421],
    ['', null],
  ])('%p → %p', (raw, expected) => expect(parseNumber(raw)).toBe(expected));

  it.each(['abc', '1,2,3', '12a', '--5'])('%p geçersiz', (raw) => expect(parseNumber(raw)).toBeNaN());
});

describe('validateVehicle', () => {
  it('geçerli girdiyi temizleyip döner', () => {
    const r = validateVehicle(valid, { currentYear: 2026 });
    expect(r).toEqual({
      ok: true,
      value: {
        name: 'Clio',
        make: 'Renault',
        model: 'Clio',
        year: 2019,
        plate: '34 ABC 123',
        fuelTypes: ['petrol', 'lpg'],
        tankLiters: 45,
        odometerKm: 87421,
      },
    });
  });

  it('isteğe bağlı alanlar boşsa null olur', () => {
    const r = validateVehicle(
      { ...valid, make: ' ', model: '', year: '', plate: '', tankLiters: '' },
      { currentYear: 2026 },
    );
    expect(r.ok && r.value).toMatchObject({ make: null, model: null, year: null, plate: null, tankLiters: null });
  });

  it('takma ad boşsa marka + model ad olur', () => {
    const r = validateVehicle({ ...valid, name: ' ', make: 'ford', model: 'fiesta' }, { currentYear: 2026 });
    expect(r.ok && r.value.name).toBe('Ford Fiesta');
  });

  it('aynı plaka başka araçta varsa reddedilir (boşluk farkı önemsiz)', () => {
    const r = validateVehicle(
      { ...valid, plate: '34abc123' },
      { currentYear: 2026, takenPlates: ['34 ABC 123', null] },
    );
    expect(!r.ok && r.errors.plate).toBe('vehicle.error.plateTaken');
    expect(validateVehicle(valid, { currentYear: 2026, takenPlates: ['06 XY 99'] }).ok).toBe(true);
  });

  it('yalnız elektrikli araçta depo hacmi kaydedilmez', () => {
    const r = validateVehicle({ ...valid, fuelTypes: ['electric'], tankLiters: 'x' }, { currentYear: 2026 });
    expect(r.ok && r.value.tankLiters).toBeNull();
  });

  it('ad, marka ve model hepsi boşsa; yakıt türü ve km zorunlu', () => {
    const r = validateVehicle(
      { ...valid, name: '   ', make: '', model: '', fuelTypes: [], odometerKm: '' },
      { currentYear: 2026 },
    );
    expect(r.ok).toBe(false);
    expect(!r.ok && r.errors).toEqual({
      name: 'vehicle.error.nameRequired',
      fuelTypes: 'vehicle.error.fuelRequired',
      odometerKm: 'vehicle.error.odometerRequired',
    });
  });

  it.each([
    ['year', '1949'],
    ['year', '2028'],
    ['year', '2019,5'],
    ['year', 'abc'],
    ['tankLiters', '0'],
    ['tankLiters', '301'],
    ['tankLiters', 'x'],
    ['odometerKm', '-1'],
    ['odometerKm', '2000001'],
    ['odometerKm', '12,5'],
  ] as const)('%s = %p reddedilir', (field, raw) => {
    const r = validateVehicle({ ...valid, [field]: raw }, { currentYear: 2026 });
    expect(!r.ok && r.errors[field]).toBeTruthy();
  });

  it('gelecek yılın modeli kabul edilir (yeni model yılı erken çıkar)', () => {
    expect(validateVehicle({ ...valid, year: '2027' }, { currentYear: 2026 }).ok).toBe(true);
  });

  it('sınırları aşan metinler reddedilir', () => {
    const r = validateVehicle({ ...valid, name: 'a'.repeat(41), make: 'b'.repeat(41) }, { currentYear: 2026 });
    expect(!r.ok && r.errors).toEqual({ name: 'vehicle.error.tooLong', make: 'vehicle.error.tooLong' });
  });

  it('bilinmeyen yakıt türü atılır', () => {
    const r = validateVehicle({ ...valid, fuelTypes: ['petrol', 'hydrogen' as never] }, { currentYear: 2026 });
    expect(r.ok && r.value.fuelTypes).toEqual(['petrol']);
  });
});

describe('plaka', () => {
  const plateOf = (plate: string, plateForeign = false) => {
    const r = validateVehicle({ ...valid, plate, plateForeign }, { currentYear: 2026 });
    return r.ok ? r.value.plate : r.errors.plate;
  };
  it('Türk plakası biçimlenir', () => expect(plateOf('34abc123')).toBe('34 ABC 123'));
  it('eksik plaka ve geçersiz il kodu reddedilir', () => {
    expect(plateOf('34 AB 12')).toBe('vehicle.error.plateFormat');
    expect(plateOf('99 A 1234')).toBe('vehicle.error.plateProvince');
  });
  it('yurt dışı plakası şablona girmez', () => expect(plateOf('b mw 1234', true)).toBe('B MW 1234'));
  it('boş plaka null', () => expect(plateOf('  ')).toBeNull());
});

describe('marka ve model yazımı', () => {
  it.each([
    ['ford', 'focus', 'Ford', 'Focus'],
    ['mg', 'zs', 'MG', 'ZS'],
    ['CITROEN', 'c3 aircross', 'Citroën', 'C3 Aircross'],
    ['honda', 'crv', 'Honda', 'CR-V'],
    ['mercedes', 'c serisi', 'Mercedes-Benz', 'C Serisi'],
    ['tofas', 'sahin', 'Tofaş', 'Şahin'],
    ['anadol', 'a1', 'Anadol', 'A1'], // katalogda yok: kelime başı büyür
    ['Ford', 'Focus ST-Line', 'Ford', 'Focus ST-Line'], // katalogda olmayan model olduğu gibi kalır
  ])('%p %p → %p %p', (make, model, expectedMake, expectedModel) => {
    const r = validateVehicle({ ...valid, make, model }, { currentYear: 2026 });
    expect(r.ok && [r.value.make, r.value.model]).toEqual([expectedMake, expectedModel]);
  });
});

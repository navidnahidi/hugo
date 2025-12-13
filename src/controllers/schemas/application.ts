import { z } from 'zod';

// US State abbreviations
const US_STATES = [
  'AL',
  'AK',
  'AZ',
  'AR',
  'CA',
  'CO',
  'CT',
  'DE',
  'FL',
  'GA',
  'HI',
  'ID',
  'IL',
  'IN',
  'IA',
  'KS',
  'KY',
  'LA',
  'ME',
  'MD',
  'MA',
  'MI',
  'MN',
  'MS',
  'MO',
  'MT',
  'NE',
  'NV',
  'NH',
  'NJ',
  'NM',
  'NY',
  'NC',
  'ND',
  'OH',
  'OK',
  'OR',
  'PA',
  'RI',
  'SC',
  'SD',
  'TN',
  'TX',
  'UT',
  'VT',
  'VA',
  'WA',
  'WV',
  'WI',
  'WY',
  'DC',
] as const;

// Helper to validate date is YYYY-MM-DD format
const dateStringSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format');

// Helper to calculate age from date
function calculateAge(dateOfBirth: string): number {
  const today = new Date();
  const birthDate = new Date(dateOfBirth);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
}

// Reusable schemas
const stateSchema = z.enum([...US_STATES] as [string, ...string[]], {
  message: 'Must be a valid US state abbreviation',
});

const zipCodeSchema = z
  .string()
  .length(5, 'Zip code must be exactly 5 digits')
  .regex(/^\d{5}$/, 'Zip code must be 5 digits');

const nameSchema = z.string().min(1, 'Name is required');

const genderSchema = z.enum(['male', 'female', 'non-binary']);

// Age validation helper
const createAgeValidation = (minAge: number, errorMessage: string) =>
  dateStringSchema.refine((date) => calculateAge(date) >= minAge, { message: errorMessage });

// Driver's License Schema
const driversLicenseSchema = z.object({
  number: z
    .string()
    .length(9, "Driver's license number must be exactly 9 characters")
    .regex(/^[A-Z0-9]{9}$/, "Driver's license number must be 9 uppercase alphanumeric characters")
    .transform((val) => val.toUpperCase()),
  state: stateSchema,
});

// Base address schema
const baseAddressSchema = {
  street: nameSchema,
  city: nameSchema,
  state: stateSchema,
  zipCode: zipCodeSchema,
};

// Address Schema (for garaging address)
export const addressSchema = z.object(baseAddressSchema).partial();

// Address with Unit Schema (for mailing address)
export const addressWithUnitSchema = z
  .object({
    ...baseAddressSchema,
    unit: z.string().optional(),
  })
  .partial();

// Base driver fields
const baseDriverFields = {
  firstName: nameSchema,
  lastName: nameSchema,
  gender: genderSchema,
};

// Primary Driver Schema
export const primaryDriverSchema = z
  .object({
    ...baseDriverFields,
    dateOfBirth: createAgeValidation(18, 'Primary driver must be at least 18 years old'),
    maritalStatus: z.enum(['single', 'married', 'divorced', 'widowed']),
    driversLicense: driversLicenseSchema,
  })
  .partial();

// Additional Driver Schema
export const additionalDriverSchema = z
  .object({
    ...baseDriverFields,
    dateOfBirth: createAgeValidation(16, 'Additional driver must be at least 16 years old'),
    relationship: z.enum(['spouse', 'child', 'parent', 'sibling', 'other']),
  })
  .partial();

// Vehicle Schema
const currentYear = new Date().getFullYear();
export const vehicleSchema = z
  .object({
    make: nameSchema,
    model: nameSchema,
    year: z
      .number()
      .int('Year must be an integer')
      .min(1985, 'Year must be 1985 or later')
      .max(currentYear + 1, `Year must be ${currentYear + 1} or earlier`),
    vin: z
      .string()
      .length(17, 'VIN must be exactly 17 characters')
      .regex(/^[0-9A-HJ-NPR-Z]{17}$/, 'VIN contains invalid characters (I, O, Q are not allowed)')
      .transform((val) => val.toUpperCase()),
  })
  .partial();

// Application Schema (allows partial data)
export const applicationSchema = z
  .object({
    primaryDriver: primaryDriverSchema.optional(),
    mailingAddress: addressWithUnitSchema.optional(),
    garagingAddress: addressSchema.optional(),
    vehicles: z.record(z.string(), vehicleSchema).optional(),
    additionalDrivers: z.record(z.string(), additionalDriverSchema).optional(),
  })
  .strict(); // Reject unknown fields

// Type exports
export type PrimaryDriver = z.infer<typeof primaryDriverSchema>;
export type Vehicle = z.infer<typeof vehicleSchema>;
export type Address = z.infer<typeof addressSchema>;
export type AddressWithUnit = z.infer<typeof addressWithUnitSchema>;
export type AdditionalDriver = z.infer<typeof additionalDriverSchema>;
export type Application = z.infer<typeof applicationSchema>;

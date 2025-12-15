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

// Current year for vehicle validation
const currentYear = new Date().getFullYear();

// Comprehensive Application Schema matching README structure
// All fields are partial to allow incremental updates
export const applicationSchema = z
  .object({
    // Primary Driver
    primaryDriver: z
      .object({
        firstName: nameSchema,
        lastName: nameSchema,
        dateOfBirth: createAgeValidation(18, 'Primary driver must be at least 18 years old'),
        gender: genderSchema,
        maritalStatus: z.enum(['single', 'married', 'divorced', 'widowed'], {
          message: 'Marital status must be one of: single, married, divorced, widowed',
        }),
        driversLicense: z.object({
          number: z
            .string()
            .length(9, "Driver's license number must be exactly 9 characters")
            .regex(
              /^[A-Z0-9]{9}$/,
              "Driver's license number must be 9 uppercase alphanumeric characters"
            )
            .transform((val) => val.toUpperCase()),
          state: stateSchema,
        }),
      })
      .partial()
      .optional(),

    // Mailing Address (with optional unit)
    mailingAddress: z
      .object({
        street: nameSchema.optional(),
        unit: z.string().optional(), // Optional field
        city: nameSchema.optional(),
        state: stateSchema.optional(),
        zip: zipCodeSchema.optional(),
      })
      .partial()
      .optional(),

    // Garaging Address
    garagingAddress: z
      .object({
        street: nameSchema.optional(),
        city: nameSchema.optional(),
        state: stateSchema.optional(),
        zip: zipCodeSchema.optional(),
      })
      .partial()
      .optional(),

    // Vehicles (record with ID as key)
    // Application must have at least 1 vehicle and max 3 vehicles (enforced in schema)
    vehicles: z
      .record(
        z.string(),
        z
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
              .regex(
                /^[0-9A-HJ-NPR-Z]{17}$/,
                'VIN contains invalid characters (I, O, Q are not allowed)'
              )
              .transform((val) => val.toUpperCase()),
          })
          .partial()
      )
      .refine(
        (vehicles) => {
          if (!vehicles) return true; // Optional field, so undefined/null is valid for partial updates
          const count = Object.keys(vehicles).length;
          return count >= 1 && count <= 3;
        },
        {
          message: 'Application must have at least 1 vehicle and not more than 3 vehicles',
        }
      )
      .optional(),

    // Additional Drivers (record with ID as key)
    // Application may have additional drivers, max 3 (enforced in schema)
    additionalDrivers: z
      .record(
        z.string(),
        z
          .object({
            firstName: nameSchema,
            lastName: nameSchema,
            dateOfBirth: createAgeValidation(16, 'Additional driver must be at least 16 years old'),
            gender: genderSchema,
            relationship: z.enum(['spouse', 'child', 'parent', 'sibling', 'other'], {
              message: 'Relationship must be one of: spouse, child, parent, sibling, other',
            }),
          })
          .partial()
      )
      .refine(
        (drivers) => {
          if (!drivers) return true; // Optional field, so undefined/null is valid
          return Object.keys(drivers).length <= 3;
        },
        {
          message: 'Application must not have more than 3 additional drivers',
        }
      )
      .optional(),
  })
  .partial() // Allow partial updates at the top level
  .strict(); // Reject unknown fields

// Strict schema for submission - all required fields must be present
export const applicationSubmissionSchema = z
  .object({
    // Primary Driver - REQUIRED for submission
    primaryDriver: z.object({
      firstName: nameSchema,
      lastName: nameSchema,
      dateOfBirth: createAgeValidation(18, 'Primary driver must be at least 18 years old'),
      gender: genderSchema,
      maritalStatus: z.enum(['single', 'married', 'divorced', 'widowed'], {
        message: 'Marital status must be one of: single, married, divorced, widowed',
      }),
      driversLicense: z.object({
        number: z
          .string()
          .length(9, "Driver's license number must be exactly 9 characters")
          .regex(
            /^[A-Z0-9]{9}$/,
            "Driver's license number must be 9 uppercase alphanumeric characters"
          )
          .transform((val) => val.toUpperCase()),
        state: stateSchema,
      }),
    }),

    // Mailing Address - REQUIRED for submission
    mailingAddress: z.object({
      street: nameSchema,
      unit: z.string().optional(), // Optional field
      city: nameSchema,
      state: stateSchema,
      zip: zipCodeSchema,
    }),

    // Garaging Address - REQUIRED for submission
    garagingAddress: z.object({
      street: nameSchema,
      city: nameSchema,
      state: stateSchema,
      zip: zipCodeSchema,
    }),

    // Vehicles - REQUIRED for submission (1-3 vehicles)
    vehicles: z
      .record(
        z.string(),
        z.object({
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
            .regex(
              /^[0-9A-HJ-NPR-Z]{17}$/,
              'VIN contains invalid characters (I, O, Q are not allowed)'
            )
            .transform((val) => val.toUpperCase()),
        })
      )
      .refine(
        (vehicles) => {
          const count = Object.keys(vehicles).length;
          return count >= 1 && count <= 3;
        },
        {
          message: 'Application must have at least 1 vehicle and not more than 3 vehicles',
        }
      ),

    // Additional Drivers - OPTIONAL for submission (max 3)
    additionalDrivers: z
      .record(
        z.string(),
        z.object({
          firstName: nameSchema,
          lastName: nameSchema,
          dateOfBirth: createAgeValidation(16, 'Additional driver must be at least 16 years old'),
          gender: genderSchema,
          relationship: z.enum(['spouse', 'child', 'parent', 'sibling', 'other'], {
            message: 'Relationship must be one of: spouse, child, parent, sibling, other',
          }),
        })
      )
      .refine(
        (drivers) => {
          if (!drivers) return true; // Optional, so empty is OK
          return Object.keys(drivers).length <= 3;
        },
        {
          message: 'Application must not have more than 3 additional drivers',
        }
      )
      .optional(),
  })
  .strict(); // Reject unknown fields

// Individual component schemas for reuse (exported for backward compatibility)
// These match the structure in the main applicationSchema
export const primaryDriverSchema = z
  .object({
    firstName: nameSchema,
    lastName: nameSchema,
    dateOfBirth: createAgeValidation(18, 'Primary driver must be at least 18 years old'),
    gender: genderSchema,
    maritalStatus: z.enum(['single', 'married', 'divorced', 'widowed'], {
      message: 'Marital status must be one of: single, married, divorced, widowed',
    }),
    driversLicense: z.object({
      number: z
        .string()
        .length(9, "Driver's license number must be exactly 9 characters")
        .regex(
          /^[A-Z0-9]{9}$/,
          "Driver's license number must be 9 uppercase alphanumeric characters"
        )
        .transform((val) => val.toUpperCase()),
      state: stateSchema,
    }),
  })
  .partial();

export const addressWithUnitSchema = z
  .object({
    street: nameSchema,
    unit: z.string().optional(), // Optional field
    city: nameSchema,
    state: stateSchema,
    zip: zipCodeSchema,
  })
  .partial();

export const addressSchema = z
  .object({
    street: nameSchema,
    city: nameSchema,
    state: stateSchema,
    zip: zipCodeSchema,
  })
  .partial();

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

export const additionalDriverSchema = z
  .object({
    firstName: nameSchema,
    lastName: nameSchema,
    dateOfBirth: createAgeValidation(16, 'Additional driver must be at least 16 years old'),
    gender: genderSchema,
    relationship: z.enum(['spouse', 'child', 'parent', 'sibling', 'other'], {
      message: 'Relationship must be one of: spouse, child, parent, sibling, other',
    }),
  })
  .partial();

// Type exports
export type Application = z.infer<typeof applicationSchema>;
export type PrimaryDriver = z.infer<typeof primaryDriverSchema>;
export type AddressWithUnit = z.infer<typeof addressWithUnitSchema>;
export type Address = z.infer<typeof addressSchema>;
export type Vehicle = z.infer<typeof vehicleSchema>;
export type AdditionalDriver = z.infer<typeof additionalDriverSchema>;

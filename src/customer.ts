/**
 *  Lookup table for schedule type
 */
export const TimeFormatMap: { [key in string]: number } = {
  s: 1,
  //  m: 60,
  //  h: 3600,
};

export class TimeFormatError extends Error {}

/**
 * Customer is created for per csv row.
 */
export class Customer {
  email: string;
  text: string;
  schedule: number[];

  constructor(email: string, text: string, schedule: string) {
    console.log("email: ", email, "text", text, "schedule", schedule);
    this.email = email;
    this.text = text;
    this.schedule = Customer.parseSchedule(schedule);
  }

  /**
   * Creates a Customer object from given row.
   */
  static createCustomerFromRow(row: {
    // [key in keyof Customer]: string;
    [key in string]: string;
  }): Customer {
    return new Customer(row.email, row.text, row.schedule);
  }

  /**
   * Parses the schedule part of csv row.
   */
  static parseSchedule(schedule: string, deliminer: string = "-"): number[] {
    return schedule
      .split(deliminer)
      .map((part) => {
        const timeFormat = part.slice(-1);
        if (!(timeFormat in TimeFormatMap)) {
          throw new TimeFormatError("Time format not supported!");
        }
        const offset = parseInt(part.slice(0, -1));
        return offset * TimeFormatMap[timeFormat];
      })
      .sort();
  }
}

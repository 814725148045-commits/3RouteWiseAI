/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Parses time string (e.g. '10:45 AM', '02:30 PM', '14:30', '9:15') into minutes from midnight (0..1439).
 * Returns undefined if unparseable.
 */
export function parseTimeToMinutes(timeStr?: string): number | undefined {
  if (!timeStr) return undefined;
  const clean = timeStr.trim().toUpperCase();

  // 12-hour AM/PM format (e.g. '10:45 AM', '2:30 PM')
  const match12 = clean.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (match12) {
    let hours = parseInt(match12[1], 10);
    const minutes = parseInt(match12[2], 10);
    const meridiem = match12[3].toUpperCase();

    if (hours === 12) {
      hours = meridiem === 'AM' ? 0 : 12;
    } else if (meridiem === 'PM') {
      hours += 12;
    }
    return hours * 60 + minutes;
  }

  // 24-hour military format (e.g. '14:30', '09:15')
  const match24 = clean.match(/^(\d{1,2}):(\d{2})$/);
  if (match24) {
    const hours = parseInt(match24[1], 10);
    const minutes = parseInt(match24[2], 10);
    if (hours >= 0 && hours < 24 && minutes >= 0 && minutes < 60) {
      return hours * 60 + minutes;
    }
  }

  return undefined;
}

/**
 * Formats minutes from midnight into readable 12-hour time string (e.g. '09:15 AM').
 */
export function formatMinutesToTime(minutesFromMidnight: number): string {
  const normalized = ((minutesFromMidnight % 1440) + 1440) % 1440;
  let hours24 = Math.floor(normalized / 60);
  const minutes = normalized % 60;

  const meridiem = hours24 >= 12 ? 'PM' : 'AM';
  let hours12 = hours24 % 12;
  if (hours12 === 0) hours12 = 12;

  const padMinutes = minutes < 10 ? `0${minutes}` : `${minutes}`;
  const padHours = hours12 < 10 ? `0${hours12}` : `${hours12}`;

  return `${padHours}:${padMinutes} ${meridiem}`;
}

export interface EtaEvaluation {
  estimatedArrival: string;
  estimatedArrivalMinutes: number;
  isDeadlineMissed: boolean;
  deadlineDiscrepancyMinutes?: number;
  deadlineString: string;
}

/**
 * Evaluates ETA against an order's delivery deadline.
 */
export function evaluateStopEta(
  arrivalMinutes: number,
  deliveryDeadlineStr?: string
): EtaEvaluation {
  const estimatedArrival = formatMinutesToTime(arrivalMinutes);
  const deadlineMinutes = parseTimeToMinutes(deliveryDeadlineStr);

  if (deadlineMinutes === undefined) {
    return {
      estimatedArrival,
      estimatedArrivalMinutes: arrivalMinutes,
      isDeadlineMissed: false,
      deadlineString: deliveryDeadlineStr || 'Flexible',
    };
  }

  const discrepancy = arrivalMinutes - deadlineMinutes;
  const isDeadlineMissed = discrepancy > 0;

  return {
    estimatedArrival,
    estimatedArrivalMinutes: arrivalMinutes,
    isDeadlineMissed,
    deadlineDiscrepancyMinutes: discrepancy,
    deadlineString: deliveryDeadlineStr || formatMinutesToTime(deadlineMinutes),
  };
}

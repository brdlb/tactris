/**
 * Converts seconds to a time format string
 * @param {number} seconds - Total seconds to convert
 * @returns {string} - Time in dd:hh:mm:ss format
 */
export const secondsToDhms = (seconds) => {
  if (seconds === undefined || seconds === null || isNaN(seconds)) {
    return '00:00:00:00';
  }

  // Convert to integer to handle decimal seconds
  console.log(`⏰ [timeUtils] Converting ${seconds} seconds to dhms format`);
  seconds = Math.floor(seconds);

  const days = Math.floor(seconds / (24 * 3600));
  seconds %= (24 * 3600);
  const hours = Math.floor(seconds / 3600);
  seconds %= 3600;
  const minutes = Math.floor(seconds / 60);
  seconds %= 60;

  // Format each component with leading zeros
  const formattedDays = String(days).padStart(2, '0');
  const formattedHours = String(hours).padStart(2, '0');
  const formattedMinutes = String(minutes).padStart(2, '0');
  const formattedSeconds = String(seconds).padStart(2, '0');

  const result = `${formattedDays}:${formattedHours}:${formattedMinutes}:${formattedSeconds}`;
  console.log(`⏰ [timeUtils] Converted ${Math.floor(seconds)} seconds to ${result}`);
  return result;
};
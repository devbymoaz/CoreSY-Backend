/**
 * Slot time helpers — split a day range into fixed-duration intervals.
 */

function timeToMinutes(time) {
  const [hours, minutes] = String(time).split(':').map(Number);
  return hours * 60 + minutes;
}

function minutesToTime(totalMinutes) {
  const hours = Math.floor(totalMinutes / 60) % 24;
  const minutes = totalMinutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

/**
 * Split [startTime, endTime) into duration-minute chunks.
 * Example: 10:00–13:00 duration 60 → 10:00-11:00, 11:00-12:00, 12:00-13:00
 */
function splitTimeRange(startTime, endTime, durationMinutes) {
  const start = timeToMinutes(startTime);
  const end = timeToMinutes(endTime);
  const duration = Number(durationMinutes);

  if (!Number.isFinite(duration) || duration <= 0) {
    throw new Error('duration must be a positive number of minutes');
  }
  if (end <= start) {
    throw new Error('endTime must be after startTime');
  }

  const intervals = [];
  for (let cursor = start; cursor + duration <= end; cursor += duration) {
    intervals.push({
      startTime: minutesToTime(cursor),
      endTime: minutesToTime(cursor + duration),
      duration,
    });
  }

  return intervals;
}

function shouldSplitRange(startTime, endTime, durationMinutes, splitIntoIntervals) {
  if (splitIntoIntervals === false) return false;
  if (splitIntoIntervals === true) return true;
  // Auto: split when the window is longer than one duration unit
  return timeToMinutes(endTime) - timeToMinutes(startTime) > Number(durationMinutes);
}

module.exports = {
  timeToMinutes,
  minutesToTime,
  splitTimeRange,
  shouldSplitRange,
};

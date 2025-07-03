import React from 'react';
import '../Schedule.css';

function Schedule() {
  /**
   * Schedule page component displaying weekly class timetable.
   * 
   * Returns:
   *   JSX.Element: Weekly schedule table with time slots and classes
   */
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
  const timeSlots = ['9:00 AM', '10:00 AM', '11:00 AM', '12:00 PM', '1:00 PM', '2:00 PM', '3:00 PM'];
  
  // Sample schedule data (empty for now)
  const schedule = {
    Monday: {
      '9:00 AM': { subject: 'Mathematics', room: 'Room 101' },
      '11:00 AM': { subject: 'Science', room: 'Lab 3' },
      '2:00 PM': { subject: 'History', room: 'Room 205' }
    },
    Wednesday: {
      '10:00 AM': { subject: 'Computer Science', room: 'Lab 1' },
      '1:00 PM': { subject: 'Literature', room: 'Room 304' }
    },
    Friday: {
      '9:00 AM': { subject: 'Science', room: 'Lab 3' },
      '12:00 PM': { subject: 'Mathematics', room: 'Room 101' }
    }
  };

  return (
    <div className="h-100 w-100 d-flex flex-column p-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 style={{ letterSpacing: '1px', fontWeight: 700, color: '#3a7bd5' }}>Class Schedule</h2>
        <div className="schedule-action-btns">
          <button className="btn btn-outline-secondary me-2">Export</button>
          <button className="btn btn-primary">Add Class</button>
        </div>
      </div>

      <div className="bg-secondary bg-opacity-10 p-4 rounded flex-grow-1 overflow-auto">
        <div className="table-responsive">
          <table className="table table-bordered schedule-table">
            <thead>
              <tr>
                <th width="100">Time</th>
                {days.map(day => (
                  <th key={day}>{day}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {timeSlots.map(time => (
                <tr key={time}>
                  <td className="fw-bold">{time}</td>
                  {days.map(day => {
                    const classInfo = schedule[day] && schedule[day][time];
                    return (
                      <td key={`${day}-${time}`} className={classInfo ? "bg-primary bg-opacity-50" : ""}>
                        {classInfo ? (
                          <div className="p-2">
                            <div className="fw-bold">{classInfo.subject}</div>
                            <small>{classInfo.room}</small>
                          </div>
                        ) : null}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default Schedule;

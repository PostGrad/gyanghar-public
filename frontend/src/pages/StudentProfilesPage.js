import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { users } from "../utils/api";
import { useToast } from "../contexts/ToastContext";
import { useAdminSettings } from "../contexts/AdminSettingsContext";

const StudentProfilesPage = ({ user }) => {
  const navigate = useNavigate();
  const { showError } = useToast();
  const { showInactiveStudents } = useAdminSettings();
  const [students, setStudents] = useState([]);
  const [filteredStudents, setFilteredStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: "asc" });

  // Filter states
  const [emailFilter, setEmailFilter] = useState("");
  const [phoneFilter, setPhoneFilter] = useState("");
  const [roomFilter, setRoomFilter] = useState("");
  const [poshakFilter, setPoshakFilter] = useState("");

  // Available filter options
  const [availableRooms, setAvailableRooms] = useState([]);
  const [availablePoshaks, setAvailablePoshaks] = useState([]);

  useEffect(() => {
    fetchStudents();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [
    students,
    emailFilter,
    phoneFilter,
    roomFilter,
    poshakFilter,
    sortConfig,
  ]);

  const fetchStudents = async () => {
    try {
      // Only admin can see inactive students when the global toggle is on
      const shouldShowInactive = user?.role === 'admin' && showInactiveStudents;
      const response = await users.getStudents(shouldShowInactive);
      setStudents(response.data);

      // Extract unique rooms and poshaks for filters
      const rooms = [
        ...new Set(
          response.data.map((student) => student.room_number || "Not Assigned")
        ),
      ];
      const poshaks = [
        ...new Set(
          response.data.map((student) =>
            student.poshak_first_name
              ? `${student.poshak_first_name} ${student.poshak_last_name}`
              : "Poshak Not Assigned"
          )
        ),
      ];

      setAvailableRooms(rooms.sort());
      setAvailablePoshaks(poshaks.sort());
    } catch (error) {
      showError("Failed to fetch students");
    } finally {
      setLoading(false);
    }
  };

  // Re-fetch when showInactiveStudents changes
  useEffect(() => {
    if (user) {
      fetchStudents();
    }
  }, [showInactiveStudents, user]);

  const applyFilters = () => {
    let filtered = students;

    // Apply filters
    if (emailFilter) {
      filtered = filtered.filter((student) =>
        student.email.toLowerCase().includes(emailFilter.toLowerCase())
      );
    }

    if (phoneFilter) {
      filtered = filtered.filter(
        (student) => student.phone && student.phone.includes(phoneFilter)
      );
    }

    if (roomFilter) {
      filtered = filtered.filter((student) => {
        if (roomFilter === "Not Assigned") {
          return !student.room_number;
        }
        return student.room_number === roomFilter;
      });
    }

    if (poshakFilter) {
      filtered = filtered.filter((student) => {
        if (poshakFilter === "Poshak Not Assigned") {
          return !student.poshak_first_name;
        }
        const poshakName = student.poshak_first_name
          ? `${student.poshak_first_name} ${student.poshak_last_name}`
          : "";
        return poshakName === poshakFilter;
      });
    }

    // Apply sorting
    if (sortConfig.key) {
      filtered.sort((a, b) => {
        let aValue, bValue;

        switch (sortConfig.key) {
          case "name":
            aValue = `${a.first_name} ${a.last_name}`;
            bValue = `${b.first_name} ${b.last_name}`;
            break;
          case "phone":
            aValue = a.phone || "";
            bValue = b.phone || "";
            break;
          case "poshakLeader":
            aValue = a.poshak_first_name
              ? `${a.poshak_first_name} ${a.poshak_last_name}`
              : "";
            bValue = b.poshak_first_name
              ? `${b.poshak_first_name} ${b.poshak_last_name}`
              : "";
            break;
          default:
            aValue = a[sortConfig.key] || "";
            bValue = b[sortConfig.key] || "";
        }

        if (aValue < bValue) return sortConfig.direction === "asc" ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === "asc" ? 1 : -1;
        return 0;
      });
    }

    setFilteredStudents(filtered);
  };

  const handleSort = (column) => {
    let direction = "asc";
    if (sortConfig.key === column && sortConfig.direction === "asc") {
      direction = "desc";
    }
    setSortConfig({ key: column, direction });
  };

  const handleRowClick = (student) => {
    navigate(`/student-profile/${student.id}`, { state: { student } });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-lg">Loading students...</div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gray-50 flex flex-col overflow-hidden w-full mt-16">
      {/* Header with filters */}
      <div className="bg-white shadow-sm border-b p-4 flex-shrink-0">
        <div className="max-w-7xl mx-auto px-4">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Student Profiles
          </h1>

          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email Filter
              </label>
              <input
                type="text"
                value={emailFilter}
                onChange={(e) => setEmailFilter(e.target.value)}
                placeholder="Search by email..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Phone Filter
              </label>
              <input
                type="text"
                value={phoneFilter}
                onChange={(e) => setPhoneFilter(e.target.value)}
                placeholder="Search by phone..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Room
              </label>
              <select
                value={roomFilter}
                onChange={(e) => setRoomFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Rooms</option>
                {availableRooms.map((room) => (
                  <option key={room} value={room}>
                    {room}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Poshak Leader
              </label>
              <select
                value={poshakFilter}
                onChange={(e) => setPoshakFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Poshaks</option>
                {availablePoshaks.map((poshak) => (
                  <option key={poshak} value={poshak}>
                    {poshak}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Table Container */}
      <div className="flex-1 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 h-full">
          <div className="h-full overflow-auto bg-white rounded-lg shadow-sm mt-4">
            <table className="min-w-full divide-y divide-gray-200">
              {/* Sticky Header */}
              <thead className="bg-gray-50 sticky top-0 z-10">
                <tr>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase bg-gray-50 sticky top-0 z-10">
                    <div className="break-words">#</div>
                  </th>
                  <th
                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100 bg-gray-50 sticky top-0 z-10"
                    onClick={() => handleSort("name")}
                  >
                    <div className="flex items-center gap-1">
                      Student Name
                      {sortConfig.key === "name" && (
                        <span className="text-blue-500">
                          {sortConfig.direction === "asc" ? "↑" : "↓"}
                        </span>
                      )}
                    </div>
                  </th>
                  <th
                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100 bg-gray-50 sticky top-0 z-10"
                    onClick={() => handleSort("phone")}
                  >
                    <div className="flex items-center gap-1">
                      Phone Number
                      {sortConfig.key === "phone" && (
                        <span className="text-blue-500">
                          {sortConfig.direction === "asc" ? "↑" : "↓"}
                        </span>
                      )}
                    </div>
                  </th>
                  <th
                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100 bg-gray-50 sticky top-0 z-10"
                    onClick={() => handleSort("poshakLeader")}
                  >
                    <div className="flex items-center gap-1">
                      Poshak Leader
                      {sortConfig.key === "poshakLeader" && (
                        <span className="text-blue-500">
                          {sortConfig.direction === "asc" ? "↑" : "↓"}
                        </span>
                      )}
                    </div>
                  </th>
                </tr>
              </thead>

              {/* Table Body */}
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredStudents.map((student, index) => (
                  <tr
                    key={student.id}
                    onClick={() => handleRowClick(student)}
                    className={`cursor-pointer hover:bg-gray-50 ${!student.is_active ? 'bg-red-50' : ''}`}
                  >
                    <td className="px-4 py-3 text-center text-gray-500 font-medium">
                      {index + 1}
                    </td>
                    <td className="px-4 py-3 text-gray-900 font-medium">
                      {student.first_name} {student.last_name}
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      {student.phone || "-"}
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      {student.poshak_first_name
                        ? `${student.poshak_first_name} ${student.poshak_last_name}`
                        : "Not Assigned"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {filteredStudents.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                No students found matching the filters
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentProfilesPage;

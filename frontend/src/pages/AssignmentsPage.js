import React, { useState, useEffect } from "react";
import { users, assignments } from "../utils/api";
import { useToast } from "../contexts/ToastContext";
import ConfirmationModal from "../components/ConfirmationModal";

const AssignmentsPage = ({ user }) => {
  const [students, setStudents] = useState([]);
  const [monitors, setMonitors] = useState([]);
  const [poshaks, setPoshaks] = useState([]);
  const [poshakAssignments, setPoshakAssignments] = useState([]);
  const [monitorAssignments, setMonitorAssignments] = useState([]);
  const [selectedPoshak, setSelectedPoshak] = useState("");
  const [selectedMonitor, setSelectedMonitor] = useState("");
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [activeTab, setActiveTab] = useState("poshak");
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    type: null,
    assignmentId: null,
    title: "",
    message: "",
  });

  const { showSuccess, showError } = useToast();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [
        studentsRes,
        monitorsRes,
        poshaksRes,
        poshakAssignRes,
        monitorAssignRes,
      ] = await Promise.all([
        users.getStudents(),
        users.getMonitors(),
        assignments.getPoshaks(),
        assignments.getPoshakAssignments(),
        assignments.getMonitorAssignments(),
      ]);

      setStudents(studentsRes.data);
      setMonitors(monitorsRes.data);
      setPoshaks(poshaksRes.data);
      setPoshakAssignments(poshakAssignRes.data);
      setMonitorAssignments(monitorAssignRes.data);
    } catch (error) {
      showError("Failed to fetch data");
    }
  };

  const handlePoshakAssign = async () => {
    if (!selectedPoshak || selectedStudents.length === 0) return;

    try {
      await assignments.assignPoshak({
        poshakId: parseInt(selectedPoshak),
        studentIds: selectedStudents.map((id) => parseInt(id)),
      });
      showSuccess("Poshak assigned successfully!");
      setSelectedPoshak("");
      setSelectedStudents([]);
      fetchData();
    } catch (error) {
      showError("Failed to assign poshak");
    }
  };

  const handleMonitorAssign = async () => {
    if (!selectedMonitor || selectedStudents.length === 0) return;

    try {
      await assignments.assignMonitor({
        monitorId: parseInt(selectedMonitor),
        studentIds: selectedStudents.map((id) => parseInt(id)),
      });
      showSuccess("Monitor assigned successfully!");
      setSelectedMonitor("");
      setSelectedStudents([]);
      fetchData();
    } catch (error) {
      showError("Failed to assign monitor");
    }
  };

  const toggleStudent = (studentId) => {
    setSelectedStudents((prev) =>
      prev.includes(studentId)
        ? prev.filter((id) => id !== studentId)
        : [...prev, studentId]
    );
  };

  const handleDeletePoshakAssignment = (assignmentId) => {
    setConfirmModal({
      isOpen: true,
      type: "poshak",
      assignmentId,
      title: "Delete Poshak Assignment",
      message:
        "Are you sure you want to delete this poshak assignment? This action cannot be undone.",
    });
  };

  const handleDeleteMonitorAssignment = (assignmentId) => {
    setConfirmModal({
      isOpen: true,
      type: "monitor",
      assignmentId,
      title: "Delete Monitor Assignment",
      message:
        "Are you sure you want to delete this monitor assignment? This action cannot be undone.",
    });
  };

  const handleConfirmDelete = async () => {
    const { type, assignmentId } = confirmModal;

    try {
      if (type === "poshak") {
        await assignments.deletePoshakAssignment(assignmentId);
        showSuccess("Poshak assignment deleted successfully!");
      } else if (type === "monitor") {
        await assignments.deleteMonitorAssignment(assignmentId);
        showSuccess("Monitor assignment deleted successfully!");
      }
      fetchData();
    } catch (error) {
      showError(`Failed to delete ${type} assignment`);
    }
  };

  const handleCloseConfirmModal = () => {
    setConfirmModal({
      isOpen: false,
      type: null,
      assignmentId: null,
      title: "",
      message: "",
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 mt-16">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h1 className="text-2xl font-bold mb-4">Assignments</h1>

          <div className="flex space-x-4 mb-6">
            <button
              onClick={() => setActiveTab("poshak")}
              className={`px-4 py-2 rounded ${
                activeTab === "poshak"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-200"
              }`}
            >
              Poshak Assignments
            </button>
            <button
              onClick={() => setActiveTab("monitor")}
              className={`px-4 py-2 rounded ${
                activeTab === "monitor"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-200"
              }`}
            >
              Monitor Assignments
            </button>
          </div>
        </div>

        {activeTab === "poshak" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-lg font-semibold mb-4">Assign Poshak</h2>

              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">
                  Select Poshak
                </label>
                <select
                  value={selectedPoshak}
                  onChange={(e) => setSelectedPoshak(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="">Choose Poshak</option>
                  {poshaks.map((poshak) => (
                    <option key={poshak.id} value={poshak.id}>
                      {poshak.first_name} {poshak.last_name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">
                  Select Students
                </label>
                <div className="max-h-48 overflow-y-auto border border-gray-300 rounded-md p-2">
                  {students.filter(
                    (student) =>
                      !poshakAssignments.some(
                        (assignment) =>
                          assignment.assigned_student_id === student.id
                      )
                  ).length === 0 ? ( // Exclude students already assigned to poshaks
                    <div className="p-4 text-gray-500 text-center">
                      No students available for poshak assignment (all students
                      are already assigned to poshaks)
                    </div>
                  ) : (
                    students
                      .filter(
                        (student) =>
                          !poshakAssignments.some(
                            (assignment) =>
                              assignment.assigned_student_id === student.id
                          )
                      ) // Exclude students already assigned to poshaks
                      .map((student) => (
                        <label
                          key={student.id}
                          className="flex items-center p-2 hover:bg-gray-50"
                        >
                          <input
                            type="checkbox"
                            checked={selectedStudents.includes(
                              student.id.toString()
                            )}
                            onChange={() =>
                              toggleStudent(student.id.toString())
                            }
                            className="mr-2"
                          />
                          {student.first_name} {student.last_name} - Room{" "}
                          {student.room_number}
                        </label>
                      ))
                  )}
                </div>
              </div>

              <button
                onClick={handlePoshakAssign}
                disabled={!selectedPoshak || selectedStudents.length === 0}
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                Assign Poshak
              </button>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-lg font-semibold mb-4">
                Current Poshak Assignments
              </h2>
              <div className="space-y-2">
                {poshakAssignments.length === 0 ? (
                  <div className="p-4 text-gray-500 text-center">
                    No poshak assignments yet
                  </div>
                ) : (
                  poshakAssignments.map((assignment) => (
                    <div
                      key={assignment.id}
                      className="p-3 bg-gray-50 rounded flex justify-between items-center"
                    >
                      <div>
                        <div className="font-medium">
                          {assignment.poshak_first_name}{" "}
                          {assignment.poshak_last_name}
                        </div>
                        <div className="text-sm text-gray-600">
                          → {assignment.student_first_name}{" "}
                          {assignment.student_last_name} (Room{" "}
                          {assignment.room_number})
                        </div>
                      </div>
                      <button
                        onClick={() =>
                          handleDeletePoshakAssignment(assignment.id)
                        }
                        className="text-red-600 hover:text-red-800 px-2 py-1 rounded hover:bg-red-50"
                        title="Delete assignment"
                      >
                        ✕
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === "monitor" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-lg font-semibold mb-4">Assign Monitor</h2>

              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">
                  Select Monitor Student
                </label>
                <select
                  value={selectedMonitor}
                  onChange={(e) => setSelectedMonitor(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="">Choose Monitor</option>
                  {monitors.map((monitor) => (
                    <option key={monitor.id} value={monitor.id}>
                      {monitor.first_name} {monitor.last_name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">
                  Select Students to Assign
                </label>
                <div className="max-h-48 overflow-y-auto border border-gray-300 rounded-md p-2">
                  {students
                    .filter((student) => !student.is_monitor) // Exclude students who are already monitors
                    .filter(
                      (student) =>
                        !monitorAssignments.some(
                          (assignment) =>
                            assignment.assigned_student_id === student.id
                        )
                    ).length === 0 ? ( // Exclude students already assigned to monitors
                    <div className="p-4 text-gray-500 text-center">
                      No students available for monitor assignment (all students
                      either already have monitors or are monitors themselves)
                    </div>
                  ) : (
                    students
                      .filter((student) => !student.is_monitor) // Exclude students who are already monitors
                      .filter(
                        (student) =>
                          !monitorAssignments.some(
                            (assignment) =>
                              assignment.assigned_student_id === student.id
                          )
                      ) // Exclude students already assigned to monitors
                      .map((student) => (
                        <label
                          key={student.id}
                          className="flex items-center p-2 hover:bg-gray-50"
                        >
                          <input
                            type="checkbox"
                            checked={selectedStudents.includes(
                              student.id.toString()
                            )}
                            onChange={() =>
                              toggleStudent(student.id.toString())
                            }
                            className="mr-2"
                          />
                          {student.first_name} {student.last_name} - Room{" "}
                          {student.room_number}
                        </label>
                      ))
                  )}
                </div>
              </div>

              <button
                onClick={handleMonitorAssign}
                disabled={!selectedMonitor || selectedStudents.length === 0}
                className="w-full bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 disabled:opacity-50"
              >
                Assign Monitor
              </button>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-lg font-semibold mb-4">
                Current Monitor Assignments
              </h2>
              <div className="space-y-2">
                {monitorAssignments.length === 0 ? (
                  <div className="p-4 text-gray-500 text-center">
                    No monitor assignments yet
                  </div>
                ) : (
                  monitorAssignments.map((assignment) => (
                    <div
                      key={assignment.id}
                      className="p-3 bg-gray-50 rounded flex justify-between items-center"
                    >
                      <div>
                        <div className="font-medium">
                          {assignment.monitor_first_name}{" "}
                          {assignment.monitor_last_name}
                        </div>
                        <div className="text-sm text-gray-600">
                          → {assignment.student_first_name}{" "}
                          {assignment.student_last_name} (Room{" "}
                          {assignment.room_number})
                        </div>
                      </div>
                      <button
                        onClick={() =>
                          handleDeleteMonitorAssignment(assignment.id)
                        }
                        className="text-red-600 hover:text-red-800 px-2 py-1 rounded hover:bg-red-50"
                        title="Delete assignment"
                      >
                        ✕
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={confirmModal.isOpen}
        onClose={handleCloseConfirmModal}
        onConfirm={handleConfirmDelete}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmText="Delete"
        cancelText="Cancel"
        confirmStyle="bg-red-600 hover:bg-red-700 text-white"
        icon="🗑️"
      />
    </div>
  );
};

export default AssignmentsPage;

const {serialize, metadata} = require('../utils/employeeUploads');
const errorStatus = require('../utils/errorStatus');
const mongoose = require("mongoose");
const Employee = require("../models/Employee");

const buildEmpId = (objectId) =>
  `VAM-${objectId.toString().toUpperCase()}`;

/**
 * @desc    Get all employees
 * @route   GET /api/employees
 * @access  Public
 */
exports.getAllEmployees = async (req, res) => {
  try {
    const employees = await Employee.find()
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      count: employees.length,
      data: employees.map(serialize),
    });
  } catch (error) {
    return res.status(errorStatus(error)).json({
      success: false,
      message: "Failed to fetch employees",
      error: error.message,
    });
  }
};

/**
 * @desc    Get single employee
 * @route   GET /api/employees/:id
 * @access  Public
 */
exports.getEmployeeById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid employee ID",
      });
    }

    const employee = await Employee.findById(id).lean();

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: "Employee not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: serialize(employee),
    });
  } catch (error) {
    return res.status(errorStatus(error)).json({
      success: false,
      message: "Failed to fetch employee",
      error: error.message,
    });
  }
};

/**
 * @desc    Create employee
 * @route   POST /api/employees
 * @access  Public
 */
exports.createEmployee = async (req, res) => {
  try {
    const payload = { ...req.body, uploadAssets: metadata(req.files) };
    for (const [key, files] of Object.entries(req.files || {})) payload[key] = files[0].path;
    if (payload.empId) {
      payload.empId = String(payload.empId).trim().toUpperCase();
    }

    let employee = await Employee.create(payload);

    if (!employee.empId) {
      employee.empId = buildEmpId(employee._id);
      employee = await employee.save();
    }

    return res.status(201).json({
      success: true,
      message: "Employee created successfully",
      data: serialize(employee),
    });
  } catch (error) {
    // Duplicate email handling
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "Email already exists",
      });
    }

    // Validation error
    if (error.name === "ValidationError") {
      const messages = Object.values(error.errors).map(
        (val) => val.message
      );

      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: messages,
      });
    }

    return res.status(errorStatus(error)).json({
      success: false,
      message: "Failed to create employee",
      error: error.message,
    });
  }
};

/**
 * @desc    Update employee
 * @route   PUT /api/employees/:id
 * @access  Public
 */
/**
 * @desc    Update employee
 * @route   PUT /api/employees/:id
 * @access  Public
 */
exports.updateEmployee = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid employee ID" });
    }

    // Step 1: Collect ALL text fields from req.body (Multer puts them here)
    const updates = { ...req.body };

    // Step 2: Convert salary to number if present
    if (updates.salary && updates.salary !== '') {
      updates.salary = Number(updates.salary);
    }

    // Step 3: Handle uploaded files (Multer puts them in req.files)
    if (req.files) {
      if (req.files.photo && req.files.photo[0]) {
        updates.photo = req.files.photo[0].path; // or .path depending on your multer config
      }
      if (req.files.adharCardDoc && req.files.adharCardDoc[0]) {
        updates.adharCardDoc = req.files.adharCardDoc[0].path;
      }
      if (req.files.panCardDoc && req.files.panCardDoc[0]) {
        updates.panCardDoc = req.files.panCardDoc[0].path;
      }
      if (req.files.educationProof && req.files.educationProof[0]) {
        updates.educationProof = req.files.educationProof[0].path;
      }
      if (req.files.experienceLetter && req.files.experienceLetter[0]) {
        updates.experienceLetter = req.files.experienceLetter[0].path;
      }
    }

    // Step 4: Perform the update
    const employee = await Employee.findById(id);
    if (employee) {
      updates.uploadAssets = {...employee.uploadAssets,...metadata(req.files)};
      for (const [key,value] of Object.entries(updates)) {
        if (!['_id','__v','createdAt','updatedAt'].includes(key) && !key.startsWith(String.fromCharCode(36))) employee.set(key,value);
      }
      await employee.save();
    }

    if (!employee) {
      return res.status(404).json({ success: false, message: "Employee not found" });
    }

    return res.status(200).json({
      success: true,
      message: "Employee updated successfully",
      data: serialize(employee),
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ success: false, message: "Email already exists" });
    }

    console.error("Update error:", error);

    return res.status(errorStatus(error)).json({
      success: false,
      message: "Failed to update employee",
      error: error.message,
    });
  }
};
/**
 * @desc    Delete employee
 * @route   DELETE /api/employees/:id
 * @access  Public
 */
exports.deleteEmployee = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid employee ID",
      });
    }

    const employee = await Employee.findByIdAndDelete(id);

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: "Employee not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Employee deleted successfully",
    });
  } catch (error) {
    return res.status(errorStatus(error)).json({
      success: false,
      message: "Failed to delete employee",
      error: error.message,
    });
  }
};
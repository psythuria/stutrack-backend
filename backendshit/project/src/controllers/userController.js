import User from '../models/userModel.js';
import generateToken from '../utils/generateToken.js';
import asyncHandler from '../utils/asyncHandler.js';
import AppError from '../utils/appError.js';

// @desc    Register a new user
// @route   POST /api/users
// @access  Public
export const registerUser = asyncHandler(async (req, res, next) => {
  const { firstName, lastName, email, studentId, password, department, course, yearLevel } = req.body;

  // Check if user already exists
  const userExists = await User.findOne({ $or: [{ email }, { studentId }] });
  
  if (userExists) {
    return next(new AppError('User already exists', 400));
  }

  // Create new user
  const user = await User.create({
    firstName,
    lastName,
    email,
    studentId,
    password,
    department,
    course,
    yearLevel
  });

  if (user) {
    res.status(201).json({
      _id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      studentId: user.studentId,
      department: user.department,
      course: user.course,
      yearLevel: user.yearLevel,
      role: user.role,
      token: generateToken(user._id)
    });
  } else {
    return next(new AppError('Invalid user data', 400));
  }
});

// @desc    Auth user & get token
// @route   POST /api/users/login
// @access  Public
export const loginUser = asyncHandler(async (req, res, next) => {
  const { email, password } = req.body;

  // Find user by email
  const user = await User.findOne({ email }).select('+password');

  // Check if user exists and password matches
  if (user && (await user.matchPassword(password))) {
    // Update last login time
    user.lastLogin = Date.now();
    await user.save();

    res.json({
      _id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      studentId: user.studentId,
      department: user.department,
      course: user.course,
      yearLevel: user.yearLevel,
      role: user.role,
      token: generateToken(user._id)
    });
  } else {
    return next(new AppError('Invalid email or password', 401));
  }
});

// @desc    Get user profile
// @route   GET /api/users/profile
// @access  Private
export const getUserProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);

  if (user) {
    res.json({
      _id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      studentId: user.studentId,
      department: user.department,
      course: user.course,
      yearLevel: user.yearLevel,
      role: user.role,
      profileImage: user.profileImage,
      createdAt: user.createdAt,
      lastLogin: user.lastLogin
    });
  } else {
    return next(new AppError('User not found', 404));
  }
});

// @desc    Update user profile
// @route   PUT /api/users/profile
// @access  Private
export const updateUserProfile = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.user._id);

  if (user) {
    user.firstName = req.body.firstName || user.firstName;
    user.lastName = req.body.lastName || user.lastName;
    user.email = req.body.email || user.email;
    user.department = req.body.department || user.department;
    user.course = req.body.course || user.course;
    user.yearLevel = req.body.yearLevel || user.yearLevel;
    user.profileImage = req.body.profileImage || user.profileImage;
    
    if (req.body.password) {
      user.password = req.body.password;
    }

    const updatedUser = await user.save();

    res.json({
      _id: updatedUser._id,
      firstName: updatedUser.firstName,
      lastName: updatedUser.lastName,
      email: updatedUser.email,
      studentId: updatedUser.studentId,
      department: updatedUser.department,
      course: updatedUser.course,
      yearLevel: updatedUser.yearLevel,
      role: updatedUser.role,
      profileImage: updatedUser.profileImage,
      token: generateToken(updatedUser._id)
    });
  } else {
    return next(new AppError('User not found', 404));
  }
});

// @desc    Get all users (admin only)
// @route   GET /api/users
// @access  Private/Admin
export const getUsers = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;
  
  const users = await User.find({})
    .select('-password')
    .limit(limit)
    .skip(skip)
    .sort({ createdAt: -1 });
  
  const count = await User.countDocuments();
  
  res.json({
    users,
    page,
    pages: Math.ceil(count / limit),
    total: count
  });
});

// @desc    Delete user
// @route   DELETE /api/users/:id
// @access  Private/Admin
export const deleteUser = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.params.id);

  if (user) {
    await user.deleteOne();
    res.json({ message: 'User removed' });
  } else {
    return next(new AppError('User not found', 404));
  }
});
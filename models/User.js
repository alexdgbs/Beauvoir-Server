const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  resetPasswordToken: { type: String }, 
  resetPasswordExpires: { type: Date },  
});

userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) {
    return next();
  }
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

//Método para comparar contraseñas.
userSchema.methods.matchPassword = async function(password) {
  return await bcrypt.compare(password, this.password);
};

//Crea el modelo a partir del esquema!
const User = mongoose.model('User', userSchema);

module.exports = User;

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const supabase = require('../config/db');
const config = require('../config/env');

class User {
  static async findByEmail(email) {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('email', email.toLowerCase())
      .single();

    if (error) throw error;
    return data;
  }

  static async findById(id) {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  }

  static async create(userData) {
    const { id, email, password, role = 'user', first_name, last_name, company_name, company_address, company_phone } = userData;

    // Create profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .insert({
        id,
        email: email.toLowerCase(),
        role,
        first_name,
        last_name,
        company_name,
        company_address,
        company_phone,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (profileError) throw profileError;
    return profile;
  }

  static async update(id, updateData) {
    const { data, error } = await supabase
      .from('profiles')
      .update({
        ...updateData,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async delete(id) {
    const { error } = await supabase
      .from('profiles')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return true;
  }

  static generateToken(user) {
    return jwt.sign(
      { 
        id: user.id,
        email: user.email,
        role: user.role
      },
      config.jwt.secret,
      { expiresIn: config.jwt.expiresIn }
    );
  }

  static verifyToken(token) {
    try {
      const decoded = jwt.verify(token, config.jwt.secret);
      return decoded;
    } catch (error) {
      throw new Error('Invalid token');
    }
  }

  static async authenticate(email, password) {
    // Use Supabase Auth to sign in
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) throw error;
    return data.user;
  }
}

module.exports = User;

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL || 'https://eiahkofmnjxxjbqgawrv.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseKey) {
  console.error('Error: SUPABASE_SERVICE_KEY environment variable is not set');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function resetAdmin() {
  try {
    console.log('Starting admin reset process...');

    // Generate a secure random password
    const generatePassword = () => {
      const length = 12;
      const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%';
      let password = '';
      for (let i = 0; i < length; i++) {
        const randomIndex = crypto.randomInt(charset.length);
        password += charset[randomIndex];
      }
      return password;
    };

    // Admin credentials
    const adminEmail = 'lochlann_oht@hotmail.com';
    const adminPassword = generatePassword();

    // Check if admin exists
    const { data: existingUser } = await supabase
      .from('profiles')
      .select('*')
      .eq('email', adminEmail)
      .single();

    if (existingUser) {
      console.log('Admin user already exists, updating password...');
      
      // Update auth user password
      const { data, error } = await supabase.auth.admin.updateUserById(
        existingUser.id,
        { password: adminPassword }
      );

      if (error) {
        console.error('Error updating password:', error.message);
        return;
      }

      console.log('Admin password updated successfully');
    } else {
      console.log('Creating new admin user...');
      
      // Create auth user
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: adminEmail,
        password: adminPassword
      });

      if (signUpError) {
        console.error('Error creating user:', signUpError.message);
        return;
      }

      // Create admin profile
      const { data: userData, error: userError } = await supabase
        .from('profiles')
        .insert([
          {
            id: authData.user.id,
            email: adminEmail,
            role: 'admin',
            first_name: 'Admin',
            last_name: 'User',
            company_name: 'Invoice App Admin'
          }
        ]);

      if (userError) {
        console.error('Error creating profile:', userError.message);
        return;
      }

      console.log('Admin user created successfully');
    }

    console.log('\nAdmin credentials:');
    console.log('Email:', adminEmail);
    console.log('Password:', adminPassword);
    console.log('\nPlease change this password after logging in!');

  } catch (error) {
    console.error('Error resetting admin:', error.message);
    console.error('Full error:', error);
  } finally {
    process.exit();
  }
}

resetAdmin();

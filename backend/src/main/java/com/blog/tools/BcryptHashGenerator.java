package com.blog.tools;

import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

/**
 * One-off CLI utility for generating BCrypt password hashes.
 */
public final class BcryptHashGenerator {

    private BcryptHashGenerator() {
    }

    public static void main(String[] args) {
        if (args.length != 1 || args[0] == null || args[0].isBlank()) {
            System.err.println("Usage: BcryptHashGenerator <plaintext-password>");
            System.exit(1);
        }

        BCryptPasswordEncoder encoder = new BCryptPasswordEncoder();
        System.out.println(encoder.encode(args[0]));
    }
}

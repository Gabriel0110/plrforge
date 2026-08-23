use super::SaveError;
use aes::Aes128;
use cbc::cipher::{block_padding::NoPadding, BlockDecryptMut, BlockEncryptMut, KeyIvInit};
use cbc::{Decryptor, Encryptor};

const KEY: [u8; 16] = [
    0x68, 0x00, 0x33, 0x00, 0x79, 0x00, 0x5f, 0x00, 0x67, 0x00, 0x55, 0x00, 0x79, 0x00, 0x5a, 0x00,
];

pub fn decrypt(encrypted: &[u8]) -> Result<Vec<u8>, SaveError> {
    if encrypted.is_empty() || encrypted.len() % 16 != 0 {
        return Err(SaveError::Crypto);
    }
    let mut output = encrypted.to_vec();
    let plaintext = Decryptor::<Aes128>::new(&KEY.into(), &KEY.into())
        .decrypt_padded_mut::<NoPadding>(&mut output)
        .map_err(|_| SaveError::Crypto)?;
    Ok(plaintext.to_vec())
}

pub fn encrypt(plaintext: &[u8]) -> Result<Vec<u8>, SaveError> {
    if plaintext.is_empty() {
        return Err(SaveError::Crypto);
    }
    let mut output = plaintext.to_vec();
    let padded_length = plaintext.len().div_ceil(16) * 16;
    output.resize(padded_length, 0);
    let length = output.len();
    let encrypted = Encryptor::<Aes128>::new(&KEY.into(), &KEY.into())
        .encrypt_padded_mut::<NoPadding>(&mut output, length)
        .map_err(|_| SaveError::Crypto)?;
    Ok(encrypted.to_vec())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn round_trips_full_blocks() {
        let plaintext = vec![0x2a; 32];
        assert_eq!(decrypt(&encrypt(&plaintext).unwrap()).unwrap(), plaintext);
    }

    #[test]
    fn zero_pads_partial_blocks() {
        let plaintext = vec![0x2a; 19];
        let decrypted = decrypt(&encrypt(&plaintext).unwrap()).unwrap();
        assert_eq!(&decrypted[..plaintext.len()], plaintext);
        assert!(decrypted[plaintext.len()..].iter().all(|byte| *byte == 0));
    }
}

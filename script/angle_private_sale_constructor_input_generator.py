# input generator for angle/private sale's constructor function
# read file format: "beneficiary_1,beneficiary_2,beneficiary_3...beneficiary_n"
# write file format: each line as the input of each beneficiary's timelock contract

import csv


def generate_input(r_path, w_path, token_address):
    with open(r_path, 'rb') as f:
        reader = csv.reader(f)
        addresses = list(reader)[0]
    result = ''
    for i in range(len(addresses)):
        result = result + '\"{0}\",\"{1}\"\n'.format(token_address, addresses[i])
    with open(w_path, 'wb') as f:
        f.write(result)


if __name__ == '__main__':
    READ_PATH = './read/angle_private_sale_addresses.csv'
    WRITE_PATH = './write/angle_private_sale_constructor_input.txt'
    TOKEN_ADDRESS = '0x0'

    generate_input(READ_PATH, WRITE_PATH, TOKEN_ADDRESS)

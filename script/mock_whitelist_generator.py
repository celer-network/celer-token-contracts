# whitelisted addresses generator and address arrary input generator

import csv


def generate_one_address(n):
    original_str = str(n)
    length = len(original_str)
    result = '0x' + '0' * (40 - length) + original_str
    return result

def generate_addresses(n, path):
    addresses = []
    for i in range(n):
        address = generate_one_address(i)
        addresses.append(address)
    with open(path, 'wb') as f:
        writer = csv.writer(f)
        writer.writerow(addresses)

def generate_input(r_path, w_path):
    with open(r_path, 'rb') as f:
        reader = csv.reader(f)
        addresses = list(reader)[0]
    result = ''
    for i in range(len(addresses)):
        if i == 0:
            result = result + '[\"' + addresses[i] + '\",'
        elif i == len(addresses) - 1:
            result = result + '\"' + addresses[i] + '\"]'
        else:
            result = result + '\"' + addresses[i] + '\",'
    with open(w_path, 'wb') as f:
        f.write(result)


if __name__ == "__main__":
    ADDRESS_NUMBER = 250
    READ_PATH = './read/whitelist_addresses.csv'
    WRITE_PATH = './write/whitelist_array.txt'

    # generate address list
    generate_addresses(ADDRESS_NUMBER, READ_PATH)
    # generate the string of address array as an input parameter in remix
    generate_input(READ_PATH, WRITE_PATH)

# input array of whitelisted addresses generator
# read from a csv file of whitelisted addresses and generate the array input for remix
# read file format: "address_1,address_2,...,address_n"
# write file format: input format of an address array

import csv


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
    READ_PATH = './read/whitelist_addresses.csv'
    WRITE_PATH = './write/whitelist_array.txt'

    # generate the string of address array as an input parameter in remix
    generate_input(READ_PATH, WRITE_PATH)

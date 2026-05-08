package main

import (
	"fmt"
	"os"
)

func main() {
	// args[0] itu nama program, data dari bos mulai dari index 1
	userId := os.Args[2]

	fmt.Printf("Sistem Informasi pakai Golang aktif 🐹. Halo user %s!\n", userId)
}

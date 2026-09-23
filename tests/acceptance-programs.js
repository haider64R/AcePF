export const acceptance = {
  nested: `int main() {
    int total = 0;
    for (int i = 1; i <= 4; i++) {
        for (int j = 1; j <= 4; j++) {
            if (j == 2)
                continue;
            if (i == 3 && j == 4)
                break;
            total += i * j;
        }
    }
    cout << total;
}`,
  shortCircuit: `int main() {
    int a = 1, b = 2, c = 3;
    bool x = (a++ > 5) && (++b > 2);
    bool y = (++a > 1) || (++c > 3);
    cout << a << " " << b << " " << c << " " << x << " " << y;
}`,
  references: `void modify(int x, int &y) {
    x += 10;
    y += x;
    {
        int y = 100;
        y++;
    }
}
int main() {
    int a = 5;
    int b = 2;
    modify(a, b);
    cout << a << " " << b;
}`,
  pointers: `int main() {
    int x = 10;
    int *p = &x;
    int *q = p;
    *p += 5;
    *q *= 2;
    cout << x << " " << *p << " " << *q;
}`,
};

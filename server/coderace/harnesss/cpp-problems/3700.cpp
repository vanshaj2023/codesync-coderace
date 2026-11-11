class Solution {
public:
    static const long long MOD = 1000000007LL;

    using Matrix = vector<vector<long long>>;

    Matrix multiply(const Matrix& A, const Matrix& B) {
        int n = A.size();

        Matrix C(n, vector<long long>(n, 0));

        for (int i = 0; i < n; i++) {
            for (int k = 0; k < n; k++) {
                if (A[i][k] == 0) continue;

                for (int j = 0; j < n; j++) {
                    if (B[k][j] == 0) continue;

                    C[i][j] =
                        (C[i][j] + A[i][k] * B[k][j]) % MOD;
                }
            }
        }

        return C;
    }

    Matrix power(Matrix base, long long exp) {
        int n = base.size();

        Matrix res(n, vector<long long>(n, 0));

        for (int i = 0; i < n; i++)
            res[i][i] = 1;

        while (exp) {
            if (exp & 1)
                res = multiply(res, base);

            base = multiply(base, base);

            exp >>= 1;
        }

        return res;
    }

    int zigZagArrays(int n, int l, int r) {

        int K = r - l + 1;

        int S = 2 * K;

        Matrix T(S, vector<long long>(S, 0));

        // UP states : [0 ... K-1]
        // DOWN states : [K ... 2K-1]

        for (int cur = 0; cur < K; cur++) {

            // last move UP
            for (int nxt = 0; nxt < cur; nxt++) {
                T[K + nxt][cur] = 1;
            }

            // last move DOWN
            for (int nxt = cur + 1; nxt < K; nxt++) {
                T[nxt][K + cur] = 1;
            }
        }

        vector<long long> base(S, 0);

        // length = 2

        for (int last = 0; last < K; last++) {

            // ending at 'last' with last move UP
            base[last] = last;

            // ending at 'last' with last move DOWN
            base[K + last] = K - 1 - last;
        }

        if (n == 2) {
            long long ans = 0;

            for (auto x : base)
                ans = (ans + x) % MOD;

            return ans;
        }

        Matrix P = power(T, n - 2);

        vector<long long> finalState(S, 0);

        for (int i = 0; i < S; i++) {
            for (int j = 0; j < S; j++) {
                finalState[i] =
                    (finalState[i] + P[i][j] * base[j]) % MOD;
            }
        }

        long long ans = 0;

        for (auto x : finalState)
            ans = (ans + x) % MOD;

        return (int)ans;
    }
};